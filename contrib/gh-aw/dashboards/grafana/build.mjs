#!/usr/bin/env node
// Regenerates the dashboard JSON files in ./ from definitions.mjs.
// Usage: node build.mjs [--check]   (--check fails if the committed JSON is stale)
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { dashboards } from "./definitions.mjs";

const dir = dirname(fileURLToPath(import.meta.url));
const check = process.argv.includes("--check");
let stale = 0;

for (const [name, dash] of Object.entries(dashboards)) {
  const file = join(dir, `${name}.json`);
  const next = `${JSON.stringify(dash, null, 2)}\n`;
  if (check) {
    if (!existsSync(file) || readFileSync(file, "utf8") !== next) {
      console.error(`stale: ${name}.json`);
      stale++;
    }
  } else {
    writeFileSync(file, next);
    console.log(`wrote ${name}.json (${dash.panels.length} panels)`);
  }
}

if (stale) process.exit(1);
