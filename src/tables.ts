import { visit } from "unist-util-visit"
import type { Root, Element } from "hast"
import { dominantScript } from "./bidi"

function collectTableText(node: Element): string {
  let out = ""
  const walk = (n: any) => {
    if (n.type === "text") out += n.value
    else if (n.type === "element") for (const c of n.children) walk(c)
  }
  for (const c of node.children) walk(c)
  return out
}

/**
 * Tables have the exact same problem as lists (Pain Point #3): column
 * order is controlled by the TABLE's direction, not each cell's. We set
 * dir on <table> itself (flips column order) and propagate the same dir
 * down to every <tr> so that Pass 3 in index.ts can read it from a td/th's
 * immediate parent without a deeper ancestor walk.
 */
export function fixTableDirection(tree: Root) {
  visit(tree, "element", (node: Element) => {
    if (node.tagName !== "table") return
    const dom = dominantScript(collectTableText(node))
    if (dom === null) return

    node.properties = node.properties ?? {}
    node.properties.dir = dom

    visit(node, "element", (row: Element) => {
      if (row.tagName === "tr") {
        row.properties = row.properties ?? {}
        row.properties.dir = dom
      }
    })
  })
}