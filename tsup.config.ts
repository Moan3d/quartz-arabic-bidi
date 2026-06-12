import { defineConfig } from "tsup"

// These must be the SAME instance across all plugins — never bundle them
const SINGLETONS = [
  "preact",
  "preact/hooks",
  "preact/jsx-runtime",
  "preact/compat",
  "@jackyzha0/quartz",
  "@jackyzha0/quartz/*",
  "@quartz-community/types", // Prevents duplicate module errors
  "@quartz-community/*",
  "vfile",
  "vfile/*",
  "unified",
]

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  noExternal: [/.*/],   // bundle everything…
  external: SINGLETONS, // …except singletons
})
