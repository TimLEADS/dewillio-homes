/**
 * Extracts every SQL literal in src/ and asks Postgres to PREPARE it against
 * the real schema. That validates syntax, table and column names, and dialect
 * for all queries — including those inside server actions that cannot easily be
 * invoked outside a Next.js request.
 *
 *   npm run check:sql
 */
import { PGlite } from "@electric-sql/pglite";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { setPoolOverride, toPgSql } from "../src/lib/pg.ts";

const SQL_START = /^\s*(SELECT|INSERT|UPDATE|DELETE|WITH)\b/i;
// Prose like "Select an agent." also starts with a keyword; real statements
// always carry a second clause keyword too.
const SQL_BODY = /\b(FROM|INTO|SET|VALUES|WHERE|JOIN)\b/i;

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const p = path.join(dir, entry);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(entry)) out.push(p);
  }
  return out;
}

/** Pulls backtick, single- and double-quoted literals out of a source file. */
function extractLiterals(source) {
  const found = [];
  const push = (text, index) => {
    if (SQL_START.test(text) && SQL_BODY.test(text)) found.push({ text, index });
  };

  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    if (ch === "`" || ch === "'" || ch === '"') {
      let j = i + 1;
      let body = "";
      while (j < source.length) {
        if (source[j] === "\\") {
          body += source[j + 1] ?? "";
          j += 2;
          continue;
        }
        if (source[j] === ch) break;
        body += source[j];
        j++;
      }
      if (j < source.length) push(body, i);
      i = j;
    }
  }
  return found;
}

const pg = new PGlite();
await pg.waitReady;

const run = async (text, values) => {
  if (values === undefined) {
    const res = await pg.exec(text);
    const last = res[res.length - 1] ?? {};
    return { rows: last.rows ?? [], fields: last.fields ?? [], rowCount: last.affectedRows ?? 0 };
  }
  const res = await pg.query(text, values);
  return { rows: res.rows ?? [], fields: res.fields ?? [], rowCount: res.affectedRows ?? 0 };
};
setPoolOverride({ query: run, connect: async () => ({ query: run, release() {} }) });

// Build the schema (and seed) exactly as the app does.
const { getDb } = await import("../src/lib/db.ts");
await getDb().prepare("SELECT 1 AS ok").get();

const files = walk("src").filter((f) => !f.endsWith(path.join("lib", "pg.ts")));
const seen = new Map();
for (const file of files) {
  const source = readFileSync(file, "utf8");
  for (const { text } of extractLiterals(source)) {
    const key = text.trim();
    if (!seen.has(key)) seen.set(key, file);
  }
}

console.log(`Found ${seen.size} distinct SQL statements across ${files.length} files.\n`);

let n = 0;
let failed = 0;
for (const [sql, file] of seen) {
  n++;
  const { text } = toPgSql(sql);
  try {
    await pg.exec(`PREPARE __check_${n} AS ${text}`);
  } catch (err) {
    failed++;
    const rel = file.split(path.sep).join("/");
    console.log(`FAIL  ${rel}`);
    console.log(`      ${sql.replace(/\s+/g, " ").slice(0, 110)}`);
    console.log(`      ${String(err.message).split("\n")[0]}\n`);
  }
}

console.log(
  failed === 0
    ? `All ${n} SQL statements parse and plan against the real schema.`
    : `${failed} of ${n} statements FAILED.`
);
process.exit(failed === 0 ? 0 : 1);
