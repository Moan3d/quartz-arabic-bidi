// node_modules/unist-util-is/lib/index.js
var convert = (
  // Note: overloads in JSDoc can’t yet use different `@template`s.
  /**
   * @type {(
   *   (<Condition extends string>(test: Condition) => (node: unknown, index?: number | null | undefined, parent?: Parent | null | undefined, context?: unknown) => node is Node & {type: Condition}) &
   *   (<Condition extends Props>(test: Condition) => (node: unknown, index?: number | null | undefined, parent?: Parent | null | undefined, context?: unknown) => node is Node & Condition) &
   *   (<Condition extends TestFunction>(test: Condition) => (node: unknown, index?: number | null | undefined, parent?: Parent | null | undefined, context?: unknown) => node is Node & Predicate<Condition, Node>) &
   *   ((test?: null | undefined) => (node?: unknown, index?: number | null | undefined, parent?: Parent | null | undefined, context?: unknown) => node is Node) &
   *   ((test?: Test) => Check)
   * )}
   */
  /**
   * @param {Test} [test]
   * @returns {Check}
   */
  (function(test) {
    if (test === null || test === void 0) {
      return ok;
    }
    if (typeof test === "function") {
      return castFactory(test);
    }
    if (typeof test === "object") {
      return Array.isArray(test) ? anyFactory(test) : (
        // Cast because `ReadonlyArray` goes into the above but `isArray`
        // narrows to `Array`.
        propertiesFactory(
          /** @type {Props} */
          test
        )
      );
    }
    if (typeof test === "string") {
      return typeFactory(test);
    }
    throw new Error("Expected function, string, or object as test");
  })
);
function anyFactory(tests) {
  const checks = [];
  let index = -1;
  while (++index < tests.length) {
    checks[index] = convert(tests[index]);
  }
  return castFactory(any);
  function any(...parameters) {
    let index2 = -1;
    while (++index2 < checks.length) {
      if (checks[index2].apply(this, parameters)) return true;
    }
    return false;
  }
}
function propertiesFactory(check) {
  const checkAsRecord = (
    /** @type {Record<string, unknown>} */
    check
  );
  return castFactory(all);
  function all(node) {
    const nodeAsRecord = (
      /** @type {Record<string, unknown>} */
      /** @type {unknown} */
      node
    );
    let key;
    for (key in check) {
      if (nodeAsRecord[key] !== checkAsRecord[key]) return false;
    }
    return true;
  }
}
function typeFactory(check) {
  return castFactory(type);
  function type(node) {
    return node && node.type === check;
  }
}
function castFactory(testFunction) {
  return check;
  function check(value, index, parent) {
    return Boolean(
      looksLikeANode(value) && testFunction.call(
        this,
        value,
        typeof index === "number" ? index : void 0,
        parent || void 0
      )
    );
  }
}
function ok() {
  return true;
}
function looksLikeANode(value) {
  return value !== null && typeof value === "object" && "type" in value;
}

// node_modules/unist-util-visit-parents/lib/color.node.js
function color(d) {
  return "\x1B[33m" + d + "\x1B[39m";
}

// node_modules/unist-util-visit-parents/lib/index.js
var empty = [];
var CONTINUE = true;
var EXIT = false;
var SKIP = "skip";
function visitParents(tree, test, visitor, reverse) {
  let check;
  if (typeof test === "function" && typeof visitor !== "function") {
    reverse = visitor;
    visitor = test;
  } else {
    check = test;
  }
  const is2 = convert(check);
  const step = reverse ? -1 : 1;
  factory(tree, void 0, [])();
  function factory(node, index, parents) {
    const value = (
      /** @type {Record<string, unknown>} */
      node && typeof node === "object" ? node : {}
    );
    if (typeof value.type === "string") {
      const name = (
        // `hast`
        typeof value.tagName === "string" ? value.tagName : (
          // `xast`
          typeof value.name === "string" ? value.name : void 0
        )
      );
      Object.defineProperty(visit2, "name", {
        value: "node (" + color(node.type + (name ? "<" + name + ">" : "")) + ")"
      });
    }
    return visit2;
    function visit2() {
      let result = empty;
      let subresult;
      let offset;
      let grandparents;
      if (!test || is2(node, index, parents[parents.length - 1] || void 0)) {
        result = toResult(visitor(node, parents));
        if (result[0] === EXIT) {
          return result;
        }
      }
      if ("children" in node && node.children) {
        const nodeAsParent = (
          /** @type {UnistParent} */
          node
        );
        if (nodeAsParent.children && result[0] !== SKIP) {
          offset = (reverse ? nodeAsParent.children.length : -1) + step;
          grandparents = parents.concat(nodeAsParent);
          while (offset > -1 && offset < nodeAsParent.children.length) {
            const child = nodeAsParent.children[offset];
            subresult = factory(child, offset, grandparents)();
            if (subresult[0] === EXIT) {
              return subresult;
            }
            offset = typeof subresult[1] === "number" ? subresult[1] : offset + step;
          }
        }
      }
      return result;
    }
  }
}
function toResult(value) {
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value === "number") {
    return [CONTINUE, value];
  }
  return value === null || value === void 0 ? empty : [value];
}

// node_modules/unist-util-visit/lib/index.js
function visit(tree, testOrVisitor, visitorOrReverse, maybeReverse) {
  let reverse;
  let test;
  let visitor;
  if (typeof testOrVisitor === "function" && typeof visitorOrReverse !== "function") {
    test = void 0;
    visitor = testOrVisitor;
    reverse = visitorOrReverse;
  } else {
    test = testOrVisitor;
    visitor = visitorOrReverse;
    reverse = maybeReverse;
  }
  visitParents(tree, test, overload, reverse);
  function overload(node, parents) {
    const parent = parents[parents.length - 1];
    const index = parent ? parent.children.indexOf(node) : void 0;
    return visitor(node, index, parent);
  }
}

// src/bidi.ts
var ARABIC_RANGE = /[\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/;
var ARABIC_INDIC_DIGIT = /[\u0660-\u0669\u06F0-\u06F9]/;
var LATIN_STRONG = /[A-Za-z\u00C0-\u024F]/;
var WESTERN_DIGIT = /[0-9]/;
function classify(ch) {
  if (ARABIC_RANGE.test(ch)) return "AR";
  if (LATIN_STRONG.test(ch)) return "LATIN";
  if (ARABIC_INDIC_DIGIT.test(ch)) return "AR_DIGIT";
  if (WESTERN_DIGIT.test(ch)) return "WEST_DIGIT";
  return "NEUTRAL";
}
function strongDirOf(cls) {
  if (cls === "AR") return "rtl";
  if (cls === "LATIN") return "ltr";
  return null;
}
var OPEN_TO_CLOSE = {
  "(": ")",
  "[": "]",
  "{": "}",
  "\u201C": "\u201D",
  // “ ”
  "\u2018": "\u2019",
  // ‘ ’
  "\xAB": "\xBB"
  // « »
};
var CLOSERS = new Set(Object.values(OPEN_TO_CLOSE));
var STRAIGHT_QUOTES = /* @__PURE__ */ new Set(['"', "'"]);
function findAtomicSpans(text) {
  const spans = [];
  const stack = [];
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch in OPEN_TO_CLOSE) {
      stack.push({ ch, idx: i });
    } else if (CLOSERS.has(ch)) {
      for (let j = stack.length - 1; j >= 0; j--) {
        if (OPEN_TO_CLOSE[stack[j].ch] === ch) {
          if (j === 0) spans.push({ start: stack[j].idx, end: i });
          stack.length = j;
          break;
        }
      }
    }
  }
  return spans;
}
function dominantScript(text) {
  let ar = 0;
  let lat = 0;
  for (const ch of text) {
    const cls = classify(ch);
    if (cls === "AR") ar++;
    else if (cls === "LATIN") lat++;
  }
  if (ar === 0 && lat === 0) return null;
  return ar >= lat ? "rtl" : "ltr";
}
function isWhitespace(ch) {
  return ch === void 0 || /\s/.test(ch);
}
function isOpeningStraightQuote(text, idx) {
  const prev = idx > 0 ? text[idx - 1] : void 0;
  const next = idx < text.length - 1 ? text[idx + 1] : void 0;
  return isWhitespace(prev) && next !== void 0 && !isWhitespace(next);
}
function splitIntoRuns(text) {
  if (!text) return [];
  const atomicSpans = findAtomicSpans(text);
  const atomicByStart = /* @__PURE__ */ new Map();
  for (const span of atomicSpans) {
    const inner = text.slice(span.start + 1, span.end);
    const dir = dominantScript(inner) ?? "ltr";
    atomicByStart.set(span.start, { end: span.end, dir });
  }
  const runs = [];
  let runStart = 0;
  let runScript = null;
  let i = 0;
  const closeRun = (end) => {
    if (end > runStart) {
      runs.push({ text: text.slice(runStart, end), dir: runScript ?? "ltr" });
    }
    runStart = end;
    runScript = null;
  };
  while (i < text.length) {
    const atomic = atomicByStart.get(i);
    if (atomic) {
      if (runScript !== null && runScript !== atomic.dir) closeRun(i);
      if (runScript === null) runScript = atomic.dir;
      i = atomic.end + 1;
      continue;
    }
    const ch = text[i];
    if (STRAIGHT_QUOTES.has(ch) && isOpeningStraightQuote(text, i)) {
      closeRun(i);
    }
    const strong = strongDirOf(classify(ch));
    if (strong !== null) {
      if (runScript !== null && runScript !== strong) closeRun(i);
      runScript = strong;
    }
    i++;
  }
  closeRun(text.length);
  return runs.filter((r) => r.text.length > 0);
}
function dominantScriptOfElement(node, skipTags) {
  let text = "";
  const walk = (n) => {
    if (n.type === "text") text += n.value;
    else if (n.type === "element" && !skipTags.has(n.tagName)) {
      for (const c of n.children) walk(c);
    }
  };
  for (const c of node.children) walk(c);
  return dominantScript(text);
}

// src/lists.ts
function collectListText(node) {
  let out = "";
  const walk = (n) => {
    if (n.type === "text") out += n.value;
    else if (n.type === "element" && n.tagName !== "ol" && n.tagName !== "ul") {
      for (const c of n.children) walk(c);
    }
  };
  for (const c of node.children) walk(c);
  return out;
}
function fixListDirection(tree) {
  visit(tree, "element", (node) => {
    if (node.tagName !== "ol" && node.tagName !== "ul") return;
    const dom = dominantScript(collectListText(node));
    if (dom === null) return;
    node.properties = node.properties ?? {};
    node.properties.dir = dom;
    if (dom === "rtl") {
      const existing = node.properties.style ?? "";
      node.properties.style = `${existing} list-style-position: inside;`.trim();
    }
  });
}

// src/tables.ts
function collectTableText(node) {
  let out = "";
  const walk = (n) => {
    if (n.type === "text") out += n.value;
    else if (n.type === "element") for (const c of n.children) walk(c);
  };
  for (const c of node.children) walk(c);
  return out;
}
function fixTableDirection(tree) {
  visit(tree, "element", (node) => {
    if (node.tagName !== "table") return;
    const dom = dominantScript(collectTableText(node));
    if (dom === null) return;
    node.properties = node.properties ?? {};
    node.properties.dir = dom;
    visit(node, "element", (row) => {
      if (row.tagName === "tr") {
        row.properties = row.properties ?? {};
        row.properties.dir = dom;
      }
    });
  });
}

// src/index.ts
var BLOCK_TAGS = /* @__PURE__ */ new Set([
  "p",
  "li",
  "blockquote",
  "td",
  "th",
  "dt",
  "dd",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "figcaption",
  "caption"
]);
var defaultOptions = {
  ltrTags: ["code", "pre", "kbd", "samp", "var"]
};
function textToBdiNodes(text) {
  const runs = splitIntoRuns(text);
  if (runs.length <= 1) return [{ type: "text", value: text }];
  const nodes = [];
  for (const run of runs) {
    const leadingMatch = run.text.match(/^\s+/);
    const trailingMatch = run.text.match(/\s+$/);
    const leading = leadingMatch ? leadingMatch[0] : "";
    const trailing = trailingMatch ? trailingMatch[0] : "";
    const core = run.text.slice(leading.length, run.text.length - trailing.length);
    if (leading) nodes.push({ type: "text", value: leading });
    if (core) {
      nodes.push({
        type: "element",
        tagName: "bdi",
        properties: { dir: run.dir },
        children: [{ type: "text", value: core }]
      });
    }
    if (trailing) nodes.push({ type: "text", value: trailing });
  }
  return nodes;
}
function processInlineChildren(node, skipTags) {
  const newChildren = [];
  for (const child of node.children) {
    if (child.type === "text") {
      newChildren.push(...textToBdiNodes(child.value));
    } else if (child.type === "element" && skipTags.has(child.tagName)) {
      newChildren.push(child);
    } else if (child.type === "element") {
      processInlineChildren(child, skipTags);
      newChildren.push(child);
    } else {
      newChildren.push(child);
    }
  }
  node.children = newChildren;
}
var ArabicBidi = (userOpts) => {
  const opts = { ...defaultOptions, ...userOpts };
  const skipTags = new Set(opts.ltrTags);
  return {
    name: "ArabicBidi",
    htmlPlugins() {
      return [
        () => (tree) => {
          visit(tree, "element", (node) => {
            if (skipTags.has(node.tagName)) {
              node.properties = node.properties ?? {};
              node.properties.dir = "ltr";
              return "skip";
            }
          });
          fixListDirection(tree);
          fixTableDirection(tree);
          visit(tree, "element", (node, _index, parent) => {
            if (skipTags.has(node.tagName)) return "skip";
            if (!BLOCK_TAGS.has(node.tagName)) return;
            let dom;
            const parentTag = parent && "tagName" in parent ? parent.tagName : void 0;
            if (node.tagName === "li" && (parentTag === "ol" || parentTag === "ul")) {
              dom = parent.properties?.dir ?? null;
            } else if (node.tagName === "td" || node.tagName === "th") {
              dom = parent.properties?.dir ?? null;
            } else {
              dom = dominantScriptOfElement(node, skipTags);
            }
            if (dom === null) dom = dominantScriptOfElement(node, skipTags);
            if (dom === null) return;
            node.properties = node.properties ?? {};
            node.properties.dir = dom;
            node.properties.lang = dom === "rtl" ? "ar" : "en";
            processInlineChildren(node, skipTags);
          });
        }
      ];
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
            `.trim()
          }
        ]
      };
    }
  };
};
var index_default = ArabicBidi;
export {
  ArabicBidi,
  index_default as default
};
