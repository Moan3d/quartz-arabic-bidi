import type { QuartzTransformerPlugin } from "@quartz-community/types"
import { visit } from "unist-util-visit"
import type { Element, Text, ElementContent, Root } from "hast"

// ─── Arabic Unicode blocks (comprehensive) ───────────────────────────────────
const ARABIC_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/

// Block-level elements we set direction on (SYNTAX FIXED: removed trailing spaces)
const BLOCK_ELEMENTS = new Set([
  "p", "li", "h1", "h2", "h3", "h4", "h5", "h6",
  "blockquote", "td", "th", "figcaption", "dt", "dd", "nav", "a"
])

// These inline elements are ALWAYS technical/LTR — critical for CTF writeups
const ALWAYS_LTR = new Set(["code", "kbd", "var", "samp"])

// ── Helpers ─────────────────────────────────────────────────────────────────
function getTextContent(node: ElementContent | Root): string {
  if (node.type === "text") return (node as Text).value
  if ("children" in node)
    return (node.children as ElementContent[]).map(getTextContent).join("")
  return ""
}

function isDominantArabic(text: string): boolean {
  const ar = (text.match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g) ?? []).length
  const la = (text.match(/[A-Za-z]/g) ?? []).length
  return ar > 0 && ar >= la
}

/**
 * Split a string into alternating Arabic and LTR runs.
 * CRITICAL FIX: Numbers (0-9) and Parentheses () are now treated as LTR runs.
 * This prevents the browser's BiDi algorithm from flipping them in RTL context.
 */
function splitRuns(text: string): Array<{ value: string; isLtr: boolean }> {
  const runs: Array<{ value: string; isLtr: boolean }> = []
  if (!text) return runs

  type RunKind = "arabic" | "ltr"
  let cur = ""
  // Treat numbers and parentheses as LTR from the start if they appear first
  let kind: RunKind = ARABIC_RE.test(text[0] ?? "") ? "arabic" : "ltr"

  for (const ch of text) {
    const isAr = ARABIC_RE.test(ch)
    // SYNTAX FIXED: Added 0-9 and () to the LTR regex
    const isLa = /[A-Za-z0-9()]/.test(ch) 

    if (isAr) {
      // SYNTAX FIXED: Changed "& &" to "&&" and removed trailing spaces
      if (kind === "ltr" && cur) {
        runs.push({ value: cur, isLtr: true })
        cur = ""
      }
      kind = "arabic"
      cur += ch
    } else if (isLa) {
      if (kind === "arabic" && cur) {
        runs.push({ value: cur, isLtr: false })
        cur = ""
      }
      kind = "ltr"
      cur += ch
    } else {
      // Neutral (spaces, other punctuation) -> stay with current run
      cur += ch
    }
  }
  if (cur) runs.push({ value: cur, isLtr: kind === "ltr" })
  return runs
}

/**
 * Process the DIRECT children of an RTL block element.
 */
function bidiIsolate(children: ElementContent[]): ElementContent[] {
  const out: ElementContent[] = []

  for (const child of children) {
    // ── Text node ──────────────────────────────────────────────────────────
    if (child.type === "text") {
      const val = (child as Text).value
      const hasAr = ARABIC_RE.test(val)
      const hasLa = /[A-Za-z0-9()]/.test(val) // SYNTAX FIXED

      if (hasAr && hasLa) {
        // Mixed text: split and wrap every LTR run in <bdi dir="ltr">
        for (const run of splitRuns(val)) {
          if (run.isLtr && /[A-Za-z0-9()]/.test(run.value)) {
            out.push({
              type: "element",
              tagName: "bdi",
              properties: { dir: "ltr" },
              children: [{ type: "text", value: run.value }],
            } as Element)
          } else {
            out.push({ type: "text", value: run.value } as Text)
          }
        }
      } else {
        out.push(child)
      }
      continue
    }

    // ── Element node ───────────────────────────────────────────────────────
    if (child.type === "element") {
      const el = child as Element

      if (BLOCK_ELEMENTS.has(el.tagName)) {
        out.push(el)
        continue
      }

      if (ALWAYS_LTR.has(el.tagName)) {
        el.properties = { ...(el.properties ?? {}), dir: "ltr" }
        out.push(el)
        continue
      }

      const innerText = getTextContent(el)
      if (innerText && !isDominantArabic(innerText)) {
        el.properties = { ...(el.properties ?? {}), dir: "ltr" }
      } else if (el.children) {
        el.children = bidiIsolate(el.children)
      }
      out.push(el)
      continue
    }

    out.push(child)
  }
  return out
}

// ─── CSS injected into every page ────────────────────────────────────────────
const CSS = `
/* Arabic RTL block elements */
.arabic-rtl {
  direction: rtl;
  text-align: start;
  letter-spacing: normal;
  unicode-bidi: plaintext; /* CRITICAL: Isolates paragraph-level BiDi context */
}

/* List items in RTL context — force proper numbering and marker alignment */
.arabic-rtl ol,
.arabic-rtl ul {
  direction: rtl;
  padding-inline-start: 0;
  padding-inline-end: 2rem;
}

.arabic-rtl li {
  direction: rtl;
  text-align: start;
}

/* Numbered list markers — keep LTR to prevent flipping */
.arabic-rtl ol li::marker {
  direction: ltr;
  unicode-bidi: isolate;
}

/* <bdi dir="ltr"> and any explicit [dir="ltr"] inside RTL blocks */
.arabic-rtl bdi[dir="ltr"],
.arabic-rtl [dir="ltr"] {
  unicode-bidi: isolate; /* CRITICAL: Forces browser to treat run as atomic LTR unit */
}

/* Inline code / technical elements inside Arabic text — always LTR */
.arabic-rtl code,
.arabic-rtl kbd,
.arabic-rtl var,
.arabic-rtl samp {
  direction: ltr;
  unicode-bidi: isolate;
  display: inline-block;
  vertical-align: baseline;
}
`

// ─── Plugin ───────────────────────────────────────────────────────────────────
export const ArabicBidi: QuartzTransformerPlugin = () => ({
  name: "ArabicBidi",
  htmlPlugins() {
    return [
      () => (tree: Root) => {
        visit(tree, "element", (node: Element) => {
          if (!BLOCK_ELEMENTS.has(node.tagName)) return
          const text = getTextContent(node)
          if (!text.trim()) return

          if (isDominantArabic(text)) {
            node.properties = {
              ...(node.properties ?? {}),
              dir: "rtl",
              lang: "ar",
              className: [
                ...((node.properties?.className as string[]) ?? []),
                "arabic-rtl",
              ],
            }
            node.children = bidiIsolate(node.children)
          }
        })
      },
    ]
  },
  externalResources() {
    return {
      css: [{ content: CSS }],
    }
  },
})