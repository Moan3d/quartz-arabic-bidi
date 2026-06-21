import type { Element } from "hast"

const ARABIC_RANGE = /[\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/
const ARABIC_INDIC_DIGIT = /[\u0660-\u0669\u06F0-\u06F9]/
const LATIN_STRONG = /[A-Za-z\u00C0-\u024F]/
const WESTERN_DIGIT = /[0-9]/

type Dir = "rtl" | "ltr"
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

const OPEN_BRACKETS: Record<string, string> = { "(": ")", "[": "]", "{": "}" }
const CLOSE_BRACKETS = new Set(Object.values(OPEN_BRACKETS))

interface BracketSpan {
  start: number
  end: number
}

/**
 * Stack-based bracket-pair scanner (not regex — regex cannot correctly
 * handle nested brackets, see Open Question §8). Only OUTERMOST pairs are
 * recorded as atomic spans; nested brackets are absorbed into their parent
 * span's content for direction-determination purposes.
 */
function findBracketSpans(text: string): BracketSpan[] {
  const spans: BracketSpan[] = []
  const stack: { ch: string; idx: number }[] = []
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (ch in OPEN_BRACKETS) {
      stack.push({ ch, idx: i })
    } else if (CLOSE_BRACKETS.has(ch)) {
      for (let j = stack.length - 1; j >= 0; j--) {
        if (OPEN_BRACKETS[stack[j].ch] === ch) {
          if (j === 0) spans.push({ start: stack[j].idx, end: i })
          stack.length = j
          break
        }
      }
    }
  }
  return spans
}

/**
 * Dominant script of a text span: counts strong characters (Arabic letters
 * vs Latin letters) and returns whichever has more. Returns null if the
 * span contains no strong characters at all (pure digits/punctuation).
 */
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

/**
 * Splits text into directional runs.
 *
 * Rule (per engineering brief §6.1): a run keeps extending through neutral
 * and digit characters until a STRONG character of the OPPOSITE script
 * appears. Only then does the run close. This means trailing punctuation,
 * digits, and spaces stay attached to whichever run they are physically
 * adjacent to in the source text — we never manually decide where a lone
 * "." or "-" belongs; we let proximity decide, then hand the resulting
 * isolated runs to the browser's native UBA via <bdi>.
 *
 * Bracket pairs (§6.2) are resolved FIRST and treated as a single opaque
 * "super-character" with a fixed direction, so the general splitter can
 * never cut a bracket away from its content.
 */
export function splitIntoRuns(text: string): Run[] {
  if (!text) return []

  const bracketSpans = findBracketSpans(text)
  const atomicByStart = new Map<number, { end: number; dir: Dir }>()
  for (const span of bracketSpans) {
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

    const strong = strongDirOf(classify(text[i]))
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