/** Sanity checks for the ? / @named -> $n rewriter. No database required. */
import { toPgSql } from "../src/lib/pg.ts";

const cases = [
  ["SELECT * FROM users WHERE id = ?", "SELECT * FROM users WHERE id = $1", ["0"]],
  ["INSERT INTO t (a,b) VALUES (?, ?)", "INSERT INTO t (a,b) VALUES ($1, $2)", ["0", "1"]],
  [
    "INSERT INTO t (a,b) VALUES (@x, @y)",
    "INSERT INTO t (a,b) VALUES ($1, $2)",
    ["x", "y"],
  ],
  // repeated named param binds to the same placeholder
  ["UPDATE t SET a=@n, b=@n WHERE id=@id", "UPDATE t SET a=$1, b=$1 WHERE id=$2", ["n", "id"]],
  // literals must be left alone
  [
    "SELECT * FROM u WHERE role = 'agent' AND email = ?",
    "SELECT * FROM u WHERE role = 'agent' AND email = $1",
    ["0"],
  ],
  // a ? or @ inside a string literal is not a placeholder
  ["SELECT 'a?b' AS q, ? AS p", "SELECT 'a?b' AS q, $1 AS p", ["0"]],
  ["SELECT 'x@y.com' AS e WHERE id = ?", "SELECT 'x@y.com' AS e WHERE id = $1", ["0"]],
  // escaped quote inside a literal
  ["SELECT 'it''s ?' AS q, ? AS p", "SELECT 'it''s ?' AS q, $1 AS p", ["0"]],
  // line comment
  ["SELECT 1 -- what? \nWHERE id = ?", "SELECT 1 -- what? \nWHERE id = $1", ["0"]],
];

let failed = 0;
for (const [input, wantText, wantNames] of cases) {
  const got = toPgSql(input);
  const okText = got.text === wantText;
  const okNames = JSON.stringify(got.names) === JSON.stringify(wantNames);
  if (!okText || !okNames) {
    failed++;
    console.log("FAIL:", JSON.stringify(input));
    console.log("  text want:", JSON.stringify(wantText));
    console.log("  text got :", JSON.stringify(got.text));
    console.log("  names want:", JSON.stringify(wantNames), "got:", JSON.stringify(got.names));
  }
}
console.log(failed === 0 ? `All ${cases.length} SQL-rewrite cases passed.` : `${failed} FAILED`);
process.exit(failed === 0 ? 0 : 1);
