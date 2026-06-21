import { visit } from "unist-util-visit"
import type { Root, Element, Text, ElementContent } from "hast"
import type { QuartzTransformerPlugin } from "@quartz-community/types"
import { splitIntoRuns, dominantScriptOfElement } from "./bidi"
import { fixListDirection } from "./lists"

const BLOCK_TAGS = new Set([
  "p", "li", "blockquote", "td", "th", "dt", "dd",
  "h1", "h2", "h3", "h4", "h5", "h6", "figcaption", "caption",
])

export interface Options {
  /** Tags whose text is never processed and is forced dir="ltr" (§6.5) */
  ltrTags?: string[]
}

const defaultOptions: Required<Options> = {
  ltrTags: ["code", "pre", "kbd", "samp", "var"],
}

function textToBdiNodes(text: string): ElementContent[] {
  const runs = splitIntoRuns(text)
  // No script transition occurred — nothing needs isolating.
  if (runs.length <= 1) return [{ type: "text", value: text } as Text]

  return runs.map(
    (run): Element => ({
      type: "element",
      tagName: "bdi",
      properties: { dir: run.dir },
      children: [{ type: "text", value: run.text }],
    }),
  )
}

function processInlineChildren(node: Element, skipTags: Set<string>) {
  const newChildren: ElementContent[] = []
  for (const child of node.children) {
    if (child.type === "text") {
      newChildren.push(...textToBdiNodes(child.value))
    } else if (child.type === "element" && skipTags.has(child.tagName)) {
      newChildren.push(child) // already forced dir="ltr" in pass 1
    } else if (child.type === "element") {
      processInlineChildren(child, skipTags) // recurse into <em>, <a>, <strong>...
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
          // Pass 1 — force always-LTR tags, skip their subtree entirely
          visit(tree, "element", (node: Element) => {
            if (skipTags.has(node.tagName)) {
              node.properties = node.properties ?? {}
              node.properties.dir = "ltr"
              return "skip"
            }
          })

          // Pass 2 — fix list CONTAINER direction (§6.3)
          fixListDirection(tree)

          // Pass 3 — block-level dir/lang + inline run isolation
          visit(tree, "element", (node: Element) => {
            if (skipTags.has(node.tagName)) return "skip"
            if (!BLOCK_TAGS.has(node.tagName)) return

            const dom = dominantScriptOfElement(node, skipTags)
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
code, pre, kbd, samp, var { direction: ltr; unicode-bidi: embed; }
            `.trim(),
          },
        ],
      }
    },
  }
}

export default ArabicBidi