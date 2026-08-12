/**
 * Postgres access layer shaped like the better-sqlite3 API this app was built on.
 *
 * `getDb()` stays synchronous and returns a handle; only the terminal calls
 * (`.get()`, `.all()`, `.run()`) are async. That keeps the ~150 existing query
 * sites intact apart from an added `await`.
 *
 * Differences from better-sqlite3 that callers must respect:
 *   - every `.get()/.all()/.run()` returns a Promise
 *   - `.run()` does NOT populate `lastInsertRowid`; add `RETURNING id` and use `.get()`
 *   - `db.transaction()` takes an async callback and returns a Promise
 */
import { Pool, neonConfig, type QueryResult } from "@neondatabase/serverless";

/** Schema setup runs once per process, serialized across instances by an advisory lock. */
let readyPromise: Promise<void> | null = null;

// The driver talks WebSocket. Node 22+ ships a global; older runtimes need `ws`.
if (typeof globalThis.WebSocket === "undefined") {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  neonConfig.webSocketConstructor = require("ws");
}

/**
 * Local development against `scripts/dev-db.mjs` rather than Neon. That bridge
 * serves plain `ws:` on loopback, so the secure-WebSocket default has to go;
 * and it fronts PGlite, which answers the startup message with a plain
 * AuthenticationOk, so Neon's password pipelining would desync the stream.
 * Unset in production, where every default above is the right one.
 */
const wsProxy = process.env.PGLITE_WS_PROXY;
if (wsProxy) {
  neonConfig.wsProxy = (host, port) => `${wsProxy}/v1?address=${host}:${port}`;
  neonConfig.useSecureWebSocket = false;
  neonConfig.pipelineConnect = false;
}

/** int8 and numeric arrive as strings over the wire; COUNT()/SUM() must stay numbers. */
const INT8_OID = 20;
const NUMERIC_OID = 1700;

/** The subset of `pg.Pool` this module uses, so tests can supply their own. */
interface PoolLike {
  query(text: string, values?: unknown[]): Promise<QueryResult>;
  connect(): Promise<{
    query(text: string, values?: unknown[]): Promise<QueryResult>;
    release(): void;
  }>;
}

let pool: PoolLike | null = null;
let poolOverride: PoolLike | null = null;

/**
 * Turbopack hands pages and server actions their own instance of this module,
 * and mints another on every hot reload — each would build its own Pool and
 * hold its own connection, so a long dev session slowly accumulates them. That
 * is invisible against Neon but swamps the single-backend local database, so
 * local mode keeps one pool per process here instead of one per module.
 */
interface GlobalWithPool {
  __dewillioLocalPgPool?: PoolLike;
}
const globalForPool = globalThis as unknown as GlobalWithPool;

/**
 * Test seam: point this module at an in-process Postgres (see
 * `scripts/test-local.mjs`) instead of a real Neon connection.
 */
export function setPoolOverride(override: PoolLike | null): void {
  poolOverride = override;
  readyPromise = null;
}

function getPool(): PoolLike {
  if (poolOverride) return poolOverride;
  if (pool) return pool;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Add your Neon connection string to .env.local (locally) and to the Vercel project's Environment Variables."
    );
  }
  if (wsProxy && globalForPool.__dewillioLocalPgPool) {
    pool = globalForPool.__dewillioLocalPgPool;
    return pool;
  }
  pool = new Pool({
    connectionString: url,
    // The local bridge fronts a single PGlite backend, so a second client would
    // share its session and its open transactions. Neon has no such limit.
    // Against Neon, bound the pool and fail a stuck connection fast rather than
    // letting a request (a login, say) hang indefinitely on a busy database.
    ...(wsProxy ? { max: 1 } : { max: 10, idleTimeoutMillis: 10000, connectionTimeoutMillis: 15000 }),
  }) as unknown as PoolLike;
  if (wsProxy) globalForPool.__dewillioLocalPgPool = pool;
  return pool;
}

/**
 * Rewrites better-sqlite3 placeholders into Postgres ones, ignoring anything
 * inside string literals or comments. Returns the bind order for named params.
 */
export function toPgSql(sql: string): { text: string; names: string[] } {
  let out = "";
  const names: string[] = [];
  const indexByName = new Map<string, number>();
  let i = 0;
  let n = 0;

  while (i < sql.length) {
    const ch = sql[i];

    if (ch === "'" || ch === '"') {
      const quote = ch;
      let j = i + 1;
      while (j < sql.length) {
        if (sql[j] === quote) {
          if (sql[j + 1] === quote) j += 2;
          else break;
        } else j++;
      }
      out += sql.slice(i, Math.min(j + 1, sql.length));
      i = j + 1;
      continue;
    }

    if (ch === "-" && sql[i + 1] === "-") {
      const end = sql.indexOf("\n", i);
      const stop = end === -1 ? sql.length : end;
      out += sql.slice(i, stop);
      i = stop;
      continue;
    }

    if (ch === "/" && sql[i + 1] === "*") {
      const end = sql.indexOf("*/", i + 2);
      const stop = end === -1 ? sql.length : end + 2;
      out += sql.slice(i, stop);
      i = stop;
      continue;
    }

    if (ch === "?") {
      names.push(String(n));
      out += "$" + ++n;
      i++;
      continue;
    }

    // Named parameter (@foo) — but not the `@>` / `@@` operators.
    if (ch === "@" && /[A-Za-z_]/.test(sql[i + 1] ?? "")) {
      let j = i + 1;
      while (j < sql.length && /[A-Za-z0-9_]/.test(sql[j])) j++;
      const name = sql.slice(i + 1, j);
      let idx = indexByName.get(name);
      if (idx === undefined) {
        names.push(name);
        idx = ++n;
        indexByName.set(name, idx);
      }
      out += "$" + idx;
      i = j;
      continue;
    }

    out += ch;
    i++;
  }

  return { text: out, names };
}

/** COUNT()/SUM() come back as strings; convert them using the result's column types. */
function coerceRows(result: QueryResult): Record<string, unknown>[] {
  const numericCols = (result.fields ?? [])
    .filter((f) => f.dataTypeID === INT8_OID || f.dataTypeID === NUMERIC_OID)
    .map((f) => f.name);
  if (numericCols.length === 0) return result.rows as Record<string, unknown>[];
  return (result.rows as Record<string, unknown>[]).map((row) => {
    for (const col of numericCols) {
      if (typeof row[col] === "string") row[col] = Number(row[col]);
    }
    return row;
  });
}

type Params = unknown[] | [Record<string, unknown>];

function bindValues(names: string[], params: Params): unknown[] {
  const named = names.some((name) => !/^\d+$/.test(name));
  if (!named) return params as unknown[];
  const source = (params[0] ?? {}) as Record<string, unknown>;
  return names.map((name) => {
    const value = source[name];
    return value === undefined ? null : value;
  });
}

export interface Statement {
  get<T = Record<string, unknown>>(...params: Params): Promise<T | undefined>;
  all<T = Record<string, unknown>>(...params: Params): Promise<T[]>;
  run(...params: Params): Promise<{ changes: number }>;
}

export interface Db {
  prepare(sql: string): Statement;
  exec(sql: string): Promise<void>;
  transaction<T>(fn: (tx: Db) => Promise<T>): Promise<T>;
}

/**
 * `values === undefined` selects the simple query protocol, which is the only
 * one that accepts several statements in a single string (needed by `exec`).
 */
type Runner = (text: string, values?: unknown[]) => Promise<QueryResult>;

function makeDb(run: Runner, ensureReady: () => Promise<void>): Db {
  const query = async (sql: string, params: Params) => {
    await ensureReady();
    const { text, names } = toPgSql(sql);
    return run(text, bindValues(names, params));
  };

  return {
    prepare(sql: string): Statement {
      return {
        async get<T>(...params: Params) {
          const result = await query(sql, params);
          return coerceRows(result)[0] as T | undefined;
        },
        async all<T>(...params: Params) {
          const result = await query(sql, params);
          return coerceRows(result) as T[];
        },
        async run(...params: Params) {
          const result = await query(sql, params);
          return { changes: result.rowCount ?? 0 };
        },
      };
    },
    async exec(sql: string) {
      await ensureReady();
      await run(sql);
    },
    async transaction<T>(fn: (tx: Db) => Promise<T>): Promise<T> {
      await ensureReady();
      const client = await getPool().connect();
      const noop = async () => {};
      const txDb = makeDb((text, values) => client.query(text, values as unknown[]), noop);
      try {
        await client.query("BEGIN");
        const result = await fn(txDb);
        await client.query("COMMIT");
        return result;
      } catch (err) {
        await client.query("ROLLBACK").catch(() => {});
        throw err;
      } finally {
        client.release();
      }
    },
  };
}

let initializer: ((db: Db) => Promise<void>) | null = null;

export function setInitializer(fn: (db: Db) => Promise<void>): void {
  initializer = fn;
}

const LOCK_KEY = 8140255301;

async function ensureReady(): Promise<void> {
  if (!initializer) return;
  if (readyPromise) return readyPromise;
  readyPromise = (async () => {
    let client: Awaited<ReturnType<PoolLike["connect"]>> | null = null;
    try {
      client = await getPool().connect();
      await client.query("SELECT pg_advisory_lock($1)", [LOCK_KEY]);
      const rawDb = makeDb((text, values) => client!.query(text, values as unknown[]), async () => {});
      await initializer!(rawDb);
      await client.query("SELECT pg_advisory_unlock($1)", [LOCK_KEY]);
    } catch (err) {
      readyPromise = null;
      throw err;
    } finally {
      client?.release();
    }
  })();
  return readyPromise;
}

const db: Db = makeDb(async (text, values) => getPool().query(text, values as unknown[]), ensureReady);

/** Synchronous handle; the schema is prepared lazily on the first query. */
export function getPg(): Db {
  return db;
}
