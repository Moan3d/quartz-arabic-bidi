import { visit } from "unist-util-visit"
import type { Root, Element, Text, ElementContent } from "hast"
import type { QuartzTransformerPlugin } from "@quartz-community/types"
import { splitIntoRuns, dominantScriptOfElement, Dir } from "./bidi"
import { fixListDirection } from "./lists"
import { fixTableDirection } from "./tables"

const BLOCK_TAGS = new Set([
  "p", "li", "blockquote", "td", "th", "dt", "dd",
  "h1", "h2", "h3", "h4", "h5", "h6", "figcaption", "caption",
])

export interface Options {
  ltrTags?: string[]
}

const defaultOptions: Required<Options> = {
  ltrTags: ["code", "pre", "kbd", "samp", "var"],
}

/**
 * Converts a text node into a sequence of plain-text + <bdi> nodes.
 * CRITICAL: leading/trailing whitespace of each run is extracted into
 * separate plain text nodes, NEVER left inside the <bdi> tag — this is
 * the fix for screenshot 1 (space disappearing between HTTP and الأساس).
 */
function textToBdiNodes(text: string): ElementContent[] {
  const runs = splitIntoRuns(text)
  if (runs.length <= 1) return [{ type: "text", value: text } as Text]

  const nodes: ElementContent[] = []
  for (const run of runs) {
    const leadingMatch = run.text.match(/^\s+/)
    const trailingMatch = run.text.match(/\s+$/)
    const leading = leadingMatch ? leadingMatch[0] : ""
    const trailing = trailingMatch ? trailingMatch[0] : ""
    const core = run.text.slice(leading.length, run.text.length - trailing.length)

    if (leading) nodes.push({ type: "text", value: leading } as Text)
    if (core) {
      nodes.push({
        type: "element",
        tagName: "bdi",
        properties: { dir: run.dir },
        children: [{ type: "text", value: core }],
      } as Element)
    }
    if (trailing) nodes.push({ type: "text", value: trailing } as Text)
  }
  return nodes
}

function processInlineChildren(node: Element, skipTags: Set<string>) {
  const newChildren: ElementContent[] = []
  for (const child of node.children) {
    if (child.type === "text") {
      newChildren.push(...textToBdiNodes(child.value))
    } else if (child.type === "element" && skipTags.has(child.tagName)) {
      newChildren.push(child)
    } else if (child.type === "element") {
      processInlineChildren(child, skipTags)
      newChildren.push(child)
    } else {
      newChildren.push(child)
    }
  }
  node.children = newChildren
}

export const ArabicBidi: QuartzTransformerPlugin<Options> = (userOpts) => {
  const opts = { ...defaultOptions, ...userOpts }
  const skipTags = new Set(opts.ltrTags)

  return {
    name: "ArabicBidi",
    htmlPlugins() {
      return [
        () => (tree: Root) => {
          // Pass 1 — always-LTR tags
          visit(tree, "element", (node: Element) => {
            if (skipTags.has(node.tagName)) {
              node.properties = node.properties ?? {}
              node.properties.dir = "ltr"
              return "skip"
            }
          })

          // Pass 2 — container-level direction for lists and tables
          // (fixes screenshots 2 and 3)
          fixListDirection(tree)
          fixTableDirection(tree)

          // Pass 3 — block dir/lang (inheriting from container where
          // applicable) + inline run isolation
          visit(tree, "element", (node: Element, _index, parent) => {
            if (skipTags.has(node.tagName)) return "skip"
            if (!BLOCK_TAGS.has(node.tagName)) return

            let dom: Dir | null
            const parentTag =
              parent && "tagName" in (parent as Element) ? (parent as Element).tagName : undefined

            if (node.tagName === "li" && (parentTag === "ol" || parentTag === "ul")) {
              // Inherit from the list container — never let one English-only
              // <li> flip its own marker relative to its siblings.
              dom = ((parent as Element).properties?.dir as Dir | undefined) ?? null
            } else if (node.tagName === "td" || node.tagName === "th") {
              // parent is <tr>, already tagged by fixTableDirection
              dom = ((parent as Element).properties?.dir as Dir | undefined) ?? null
            } else {
              dom = dominantScriptOfElement(node, skipTags)
            }

            if (dom === null) dom = dominantScriptOfElement(node, skipTags)
            if (dom === null) return

            node.properties = node.properties ?? {}
            node.properties.dir = dom
            node.properties.lang = dom === "rtl" ? "ar" : "en"

            processInlineChildren(node, skipTags)
          })
        },
      ]
    },
    externalResources() {
      return {
        css: [
          {
            content: `
bdi { unicode-bidi: isolate; }
ol[dir="rtl"], ul[dir="rtl"] { padding-right: 1.5rem; padding-left: 0; }
ol[dir="rtl"]::marker, ul[dir="rtl"]::marker { unicode-bidi: isolate; }
table[dir="rtl"] { direction: rtl; }
table[dir="ltr"] { direction: ltr; }
code, pre, kbd, samp, var { direction: ltr; unicode-bidi: embed; }
            `.trim(),
          },
        ],
      }
    },
  }
}

export default ArabicBidi