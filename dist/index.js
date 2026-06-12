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

// src/index.ts
var ARABIC_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
var BLOCK_ELEMENTS = /* @__PURE__ */ new Set([
  "p",
  "li",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "blockquote",
  "td",
  "th",
  "figcaption",
  "dt",
  "dd"
]);
var ALWAYS_LTR = /* @__PURE__ */ new Set(["code", "kbd", "var", "samp"]);
function getTextContent(node) {
  if (node.type === "text") return node.value;
  if ("children" in node)
    return node.children.map(getTextContent).join("");
  return "";
}
function isDominantArabic(text) {
  const ar = (text.match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g) ?? []).length;
  const la = (text.match(/[A-Za-z]/g) ?? []).length;
  return ar > 0 && ar >= la;
}
function splitRuns(text) {
  const runs = [];
  if (!text) return runs;
  let cur = "";
  let kind = ARABIC_RE.test(text[0] ?? "") ? "arabic" : "ltr";
  for (const ch of text) {
    const isAr = ARABIC_RE.test(ch);
    const isLa = /[A-Za-z]/.test(ch);
    if (isAr) {
      if (kind === "ltr" && cur) {
        runs.push({ value: cur, isLtr: true });
        cur = "";
      }
      kind = "arabic";
      cur += ch;
    } else if (isLa) {
      if (kind === "arabic" && cur) {
        runs.push({ value: cur, isLtr: false });
        cur = "";
      }
      kind = "ltr";
      cur += ch;
    } else {
      cur += ch;
    }
  }
  if (cur) runs.push({ value: cur, isLtr: kind === "ltr" });
  return runs;
}
function bidiIsolate(children) {
  const out = [];
  for (const child of children) {
    if (child.type === "text") {
      const val = child.value;
      const hasAr = ARABIC_RE.test(val);
      const hasLa = /[A-Za-z]/.test(val);
      if (hasAr && hasLa) {
        for (const run of splitRuns(val)) {
          if (run.isLtr && /[A-Za-z0-9]/.test(run.value)) {
            out.push({
              type: "element",
              tagName: "bdi",
              properties: { dir: "ltr" },
              children: [{ type: "text", value: run.value }]
            });
          } else {
            out.push({ type: "text", value: run.value });
          }
        }
      } else {
        out.push(child);
      }
      continue;
    }
    if (child.type === "element") {
      const el = child;
      if (BLOCK_ELEMENTS.has(el.tagName)) {
        out.push(el);
        continue;
      }
      if (ALWAYS_LTR.has(el.tagName)) {
        el.properties = { ...el.properties ?? {}, dir: "ltr" };
        out.push(el);
        continue;
      }
      const innerText = getTextContent(el);
      if (innerText && !isDominantArabic(innerText)) {
        el.properties = { ...el.properties ?? {}, dir: "ltr" };
      } else if (el.children) {
        el.children = bidiIsolate(el.children);
      }
      out.push(el);
      continue;
    }
    out.push(child);
  }
  return out;
}
var CSS = `
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

/* Inline code / technical elements inside Arabic text \u2014 always LTR.
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
`;
var ArabicBidi = () => ({
  name: "ArabicBidi",
  htmlPlugins() {
    return [
      () => (tree) => {
        visit(tree, "element", (node) => {
          if (!BLOCK_ELEMENTS.has(node.tagName)) return;
          const text = getTextContent(node);
          if (!text.trim()) return;
          if (isDominantArabic(text)) {
            node.properties = {
              ...node.properties ?? {},
              dir: "rtl",
              lang: "ar",
              className: [
                ...node.properties?.className ?? [],
                "arabic-rtl"
              ]
            };
            node.children = bidiIsolate(node.children);
          }
        });
      }
    ];
  },
  externalResources() {
    return {
      css: [{ content: CSS }]
    };
  }
});
export {
  ArabicBidi
};
