#!/usr/bin/env node

import esbuild from "esbuild";
import metaUrlPlugin from "@chialab/esbuild-plugin-meta-url";

const dev = process.argv.includes("--dev");

const ctx = await esbuild.context({
  entryPoints: ["src/index.ts"],
  bundle: true,
  outfile: "dist/scripts/main.js",
  plugins: [metaUrlPlugin()],
  define: {
    DEV: dev ? "true" : "false",
    LANDING_IFRAME_URL: `"${dev ? "http://localhost:8788/landing-iframe.html" : "https://editor.archival.dev/landing-iframe.html"}"`
  },
  format: "esm",
  target: "es2022",
  sourcemap: dev,
});

if (dev) {
  await ctx.watch();

  const { host, port } = await ctx.serve({ servedir: "dist" });
  console.log(`server started at http://${host}:${port}`);
} else {
  await ctx.rebuild();
  process.exit(0);
}
