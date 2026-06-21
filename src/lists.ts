import { visit } from "unist-util-visit"
import type { Root, Element } from "hast"
import { dominantScript } from "./bidi"

function collectListText(node: Element): string {
  let out = ""
  const walk = (n: any) => {
    if (n.type === "text") out += n.value
    else if (n.type === "element" && n.tagName !== "ol" && n.tagName !== "ul") {
      for (const c of n.children) walk(c)
    }
  }
  for (const c of node.children) walk(c)
  return out
}

export function fixListDirection(tree: Root) {
  visit(tree, "element", (node: Element) => {
    if (node.tagName !== "ol" && node.tagName !== "ul") return
    const dom = dominantScript(collectListText(node))
    if (dom === null) return
    node.properties = node.properties ?? {}
    node.properties.dir = dom
    if (dom === "rtl") {
      const existing = (node.properties.style as string) ?? ""
      node.properties.style = `${existing} list-style-position: inside;`.trim()
    }
  })
}