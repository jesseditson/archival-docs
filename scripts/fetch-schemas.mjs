#!/usr/bin/env node

// Fetches archival's JSON Schema files into public/schemas/ so they are served
// from https://archival.dev/schemas/. Runs as `build:schemas`, which must stay
// ahead of `build:site` in `npm run build` - that is the step that copies
// public/ into dist/.
//
// The schemas are fetched rather than checked in so there is exactly one copy to
// keep correct. archival's CI is what gates their correctness (`cargo test
// schema_files` plus Ajv strict mode in ./validate-schemas.sh).

import fs from "node:fs/promises";
import path from "node:path";

const SCHEMAS = [
  "manifest.schema.json",
  "objects.schema.json",
  "archival_editor.schema.json",
  "archival_template.schema.json",
];

// Schemas ship from main rather than a tag: archival's CI gates them on every
// push, and pinning would mean a version bump here for every schema fix. Set
// ARCHIVAL_SCHEMA_REF to pin to a tag (e.g. "refs/tags/v0.17.0") if that ever
// stops being true.
const REF = process.env.ARCHIVAL_SCHEMA_REF ?? "refs/heads/main";
// ARCHIVAL_SCHEMA_SOURCE points the fetch somewhere else entirely - a local
// server in front of an archival checkout, say - to try schema changes here
// before they land upstream.
const SOURCE =
  process.env.ARCHIVAL_SCHEMA_SOURCE ??
  `https://raw.githubusercontent.com/jesseditson/archival/${REF}`;
const CANONICAL_ID_PREFIX = "https://archival.dev/schemas/";

const outDir = new URL("../public/schemas/", import.meta.url).pathname;

await fs.mkdir(outDir, { recursive: true });

await Promise.all(
  SCHEMAS.map(async (name) => {
    const url = `${SOURCE}/${name}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`fetching ${url}: ${response.status} ${response.statusText}`);
    }
    const body = await response.text();

    let schema;
    try {
      schema = JSON.parse(body);
    } catch (e) {
      throw new Error(`${url} is not valid JSON: ${e.message}`);
    }

    const expectedId = `${CANONICAL_ID_PREFIX}${name}`;
    if (schema.$id !== expectedId) {
      throw new Error(
        `${url} declares $id ${JSON.stringify(schema.$id)}, but it is served ` +
          `from ${expectedId}. Fix $id in archival before deploying - editors ` +
          `resolve $ref and cache against it.`,
      );
    }

    await fs.writeFile(path.join(outDir, name), body);
    console.log(`schemas: ${name} <- ${url}`);
  }),
);
