import type { Element } from "hast"

const ARABIC_RANGE = /[\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/
const ARABIC_INDIC_DIGIT = /[\u0660-\u0669\u06F0-\u06F9]/
const LATIN_STRONG = /[A-Za-z\u00C0-\u024F]/
const WESTERN_DIGIT = /[0-9]/

export type Dir = "rtl" | "ltr"
type CharClass = "AR" | "LATIN" | "AR_DIGIT" | "WEST_DIGIT" | "NEUTRAL"

function classify(ch: string): CharClass {
  if (ARABIC_RANGE.test(ch)) return "AR"
  if (LATIN_STRONG.test(ch)) return "LATIN"
  if (ARABIC_INDIC_DIGIT.test(ch)) return "AR_DIGIT"
  if (WESTERN_DIGIT.test(ch)) return "WEST_DIGIT"
  return "NEUTRAL"
}

function strongDirOf(cls: CharClass): Dir | null {
  if (cls === "AR") return "rtl"
  if (cls === "LATIN") return "ltr"
  return null
}

export interface Run {
  text: string
  dir: Dir
}

// Unified open→close map: real brackets + unambiguous curly quote pairs.
// Both get atomic, stack-matched, never-split-apart treatment (UBA rule N0).
const OPEN_TO_CLOSE: Record<string, string> = {
  "(": ")",
  "[": "]",
  "{": "}",
  "\u201C": "\u201D", // “ ”
  "\u2018": "\u2019", // ‘ ’
  "\u00AB": "\u00BB", // « »
}
const CLOSERS = new Set(Object.values(OPEN_TO_CLOSE))

// Ambiguous ASCII quotes — same character for open and close, so we
// classify by context instead of stack-pairing.
const STRAIGHT_QUOTES = new Set(['"', "'"])

interface AtomicSpan {
  start: number
  end: number
}

function findAtomicSpans(text: string): AtomicSpan[] {
  const spans: AtomicSpan[] = []
  const stack: { ch: string; idx: number }[] = []
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (ch in OPEN_TO_CLOSE) {
      stack.push({ ch, idx: i })
    } else if (CLOSERS.has(ch)) {
      for (let j = stack.length - 1; j >= 0; j--) {
        if (OPEN_TO_CLOSE[stack[j].ch] === ch) {
          if (j === 0) spans.push({ start: stack[j].idx, end: i })
          stack.length = j
          break
        }
      }
    }
  }
  return spans
}

export function dominantScript(text: string): Dir | null {
  let ar = 0
  let lat = 0
  for (const ch of text) {
    const cls = classify(ch)
    if (cls === "AR") ar++
    else if (cls === "LATIN") lat++
  }
  if (ar === 0 && lat === 0) return null
  return ar >= lat ? "rtl" : "ltr"
}

function isWhitespace(ch: string | undefined): boolean {
  return ch === undefined || /\s/.test(ch)
}

/**
 * A straight quote is "opening" if preceded by whitespace/start-of-string
 * and immediately followed by non-whitespace — the same heuristic
 * smart-quote engines use. Opening quotes must attach FORWARD to the run
 * that follows, never backward to the run that precedes (the bug in
 * screenshot 4: "DNS: " swallowed the opening quote that belonged to the
 * Arabic quoted phrase after it).
 */
function isOpeningStraightQuote(text: string, idx: number): boolean {
  const prev = idx > 0 ? text[idx - 1] : undefined
  const next = idx < text.length - 1 ? text[idx + 1] : undefined
  return isWhitespace(prev) && next !== undefined && !isWhitespace(next)
}

/**
 * Splits text into directional runs.
 *
 * - A run extends through neutral/digit characters until a STRONG
 *   character of the OPPOSITE script appears (§6.1).
 * - Bracket pairs AND curly-quote pairs are atomic — never split apart (§6.2).
 * - Straight opening quotes force a boundary and attach forward, fixing
 *   the "DNS: "" swallowing bug.
 */
export function splitIntoRuns(text: string): Run[] {
  if (!text) return []

  const atomicSpans = findAtomicSpans(text)
  const atomicByStart = new Map<number, { end: number; dir: Dir }>()
  for (const span of atomicSpans) {
    const inner = text.slice(span.start + 1, span.end)
    const dir = dominantScript(inner) ?? "ltr"
    atomicByStart.set(span.start, { end: span.end, dir })
  }

  const runs: Run[] = []
  let runStart = 0
  let runScript: Dir | null = null
  let i = 0

  const closeRun = (end: number) => {
    if (end > runStart) {
      runs.push({ text: text.slice(runStart, end), dir: runScript ?? "ltr" })
    }
    runStart = end
    runScript = null
  }

  while (i < text.length) {
    const atomic = atomicByStart.get(i)
    if (atomic) {
      if (runScript !== null && runScript !== atomic.dir) closeRun(i)
      if (runScript === null) runScript = atomic.dir
      i = atomic.end + 1
      continue
    }

    const ch = text[i]

    if (STRAIGHT_QUOTES.has(ch) && isOpeningStraightQuote(text, i)) {
      // Force a boundary here; the quote itself becomes the leading
      // character of the NEXT run, not the trailing character of this one.
      closeRun(i)
    }

    const strong = strongDirOf(classify(ch))
    if (strong !== null) {
      if (runScript !== null && runScript !== strong) closeRun(i)
      runScript = strong
    }
    i++
  }
  closeRun(text.length)

  return runs.filter((r) => r.text.length > 0)
}

export function dominantScriptOfElement(node: Element, skipTags: Set<string>): Dir | null {
  let text = ""
  const walk = (n: any) => {
    if (n.type === "text") text += n.value
    else if (n.type === "element" && !skipTags.has(n.tagName)) {
      for (const c of n.children) walk(c)
    }
  }
  for (const c of node.children) walk(c)
  return dominantScript(text)
}