import type { QuartzTransformerPlugin } from "@quartz-community/types"
import { visit } from "unist-util-visit"
import type { Element, Text, ElementContent, Root } from "hast"

// ─── Arabic Unicode blocks (comprehensive) ───────────────────────────────────
const ARABIC_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/

// Block-level elements we set direction on
const BLOCK_ELEMENTS = new Set([
  "p", "li", "h1", "h2", "h3", "h4", "h5", "h6",
  "blockquote", "td", "th", "figcaption", "dt", "dd",
])

// These inline elements are ALWAYS technical/LTR — critical for CTF writeups
const ALWAYS_LTR = new Set(["code", "kbd", "var", "samp"])

// ─── Helpers ─────────────────────────────────────────────────────────────────
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
 * Rule for neutral chars (spaces, digits, punctuation):
 * → keep them attached to the current run.
 */
function splitRuns(text: string): Array<{ value: string; isLtr: boolean }> {
  const runs: Array<{ value: string; isLtr: boolean }> = []
  if (!text) return runs

  type RunKind = "arabic" | "ltr"
  let cur = ""
  let kind: RunKind = ARABIC_RE.test(text[0] ?? "") ? "arabic" : "ltr"

  for (const ch of text) {
    const isAr = ARABIC_RE.test(ch)
    const isLa = /[A-Za-z]/.test(ch)

    if (isAr) {
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
      // Neutral: Stay with current run
      cur += ch
    }
  }
  if (cur) runs.push({ value: cur, isLtr: kind === "ltr" })
  return runs
}

/**
 * Process the DIRECT children of an RTL block element:
 * Text nodes with mixed Arabic+Latin  →  split + wrap LTR runs in <bdi dir="ltr">
 * code / kbd / var / samp             →  force dir="ltr"  (always technical)
 */
function bidiIsolate(children: ElementContent[]): ElementContent[] {
  const out: ElementContent[] = []

  for (const child of children) {
    // ── Text node ──────────────────────────────────────────────────────────
    if (child.type === "text") {
      const val = (child as Text).value
      const hasAr = ARABIC_RE.test(val)
      const hasLa = /[A-Za-z]/.test(val)

      if (hasAr && hasLa) {
        // Mixed text: split and wrap every LTR run in <bdi dir="ltr">
        for (const run of splitRuns(val)) {
          if (run.isLtr && /[A-Za-z0-9]/.test(run.value)) {
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

      // Block elements: leave for the outer visitor
      if (BLOCK_ELEMENTS.has(el.tagName)) {
        out.push(el)
        continue
      }

      // Technical inline elements → always LTR
      if (ALWAYS_LTR.has(el.tagName)) {
        el.properties = { ...(el.properties ?? {}), dir: "ltr" }
        out.push(el)
        continue
      }

      // Other inline elements (a, strong, em, span, mark, …)
      const innerText = getTextContent(el)
      if (innerText && !isDominantArabic(innerText)) {
        el.properties = { ...(el.properties ?? {}), dir: "ltr" }
      } else if (el.children) {
        el.children = bidiIsolate(el.children)
      }
      out.push(el)
      continue
    }

    // Anything else (raw HTML, comments, …) — pass through
    out.push(child)
  }
  return out
}

// ─── CSS injected into every page ────────────────────────────────────────────
const CSS = `
/* Arabic RTL block elements */
.arabic-rtl {
  direction: rtl;
  text-align: start; /* respects the element's own direction */
  letter-spacing: normal !important; /* Arabic script breaks with positive letter-spacing */
}

/* <bdi dir="ltr"> and any explicit [dir="ltr"] inside RTL blocks:
   unicode-bidi: isolate makes the browser treat each run independently */
.arabic-rtl bdi[dir="ltr"],
.arabic-rtl [dir="ltr"] {
  unicode-bidi: isolate;
}

/* Inline code / technical elements inside Arabic text — always LTR.
   display:inline-block is needed so direction applies to an inline element. */
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
          // Only care about block-level containers
          if (!BLOCK_ELEMENTS.has(node.tagName)) return

          const text = getTextContent(node)
          if (!text.trim()) return

          if (isDominantArabic(text)) {
            // 1. Mark the block as RTL
            node.properties = {
              ...(node.properties ?? {}),
              dir: "rtl",
              lang: "ar",
              className: [
                ...((node.properties?.className as string[]) ?? []),
                "arabic-rtl",
              ],
            }

            // 2. Inject <bdi> isolation for every LTR run in its inline content
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
