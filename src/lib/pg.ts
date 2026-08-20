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
 * Next gives pages, route handlers and server actions their own instance of
 * this module (and mints another on every dev hot reload). Each instance would
 * otherwise build its own Pool, so a single serverless container could hold
 * several pools' worth of Postgres connections at once — which is how a handful
 * of simultaneous visitors used to exhaust the database's connection limit and
 * take the site down. One pool per *process*, parked on globalThis, in every
 * environment.
 */
interface GlobalWithPool {
  __dewillioPgPool?: PoolLike;
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

/** Warn once if the connection string bypasses Neon's connection pooler. */
function warnIfUnpooled(url: string): void {
  if (wsProxy || url.includes("-pooler.")) return;
  console.warn(
    "[dewillio] DATABASE_URL points at a direct Neon endpoint. Use the pooled connection string (the host ends in `-pooler`) or concurrent visitors can exhaust the database's connection limit."
  );
}

function getPool(): PoolLike {
  if (poolOverride) return poolOverride;
  if (pool) return pool;
  if (globalForPool.__dewillioPgPool) {
    pool = globalForPool.__dewillioPgPool;
    return pool;
  }
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Add your Neon connection string to .env.local (locally) and to the Vercel project's Environment Variables."
    );
  }
  warnIfUnpooled(url);
  pool = new Pool({
    connectionString: url,
    // The local bridge fronts a single PGlite backend, so a second client would
    // share its session and its open transactions. Neon has no such limit.
    //
    // Against Neon: `max` is per container, and a burst of traffic can bring up
    // several containers at once, so this has to stay well under the database's
    // own limit rather than claim it all. Ten is far more than one container's
    // request concurrency needs. Idle connections are handed back quickly so a
    // container that goes quiet stops holding a slot the next visitor needs,
    // and a connection that never establishes fails fast instead of hanging a
    // login until the platform kills it.
    ...(wsProxy
      ? { max: 1 }
      : { max: 10, idleTimeoutMillis: 15000, connectionTimeoutMillis: 8000 }),
  }) as unknown as PoolLike;
  globalForPool.__dewillioPgPool = pool;
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
let upToDate: ((db: Db) => Promise<boolean>) | null = null;

/**
 * Registers schema setup, plus an optional cheap "is it already current?" probe.
 *
 * The probe matters far more than it looks. Without it every cold container ran
 * the whole DDL script before answering its first query, and `ALTER TABLE ...
 * ADD COLUMN IF NOT EXISTS` takes an ACCESS EXCLUSIVE lock on the table even
 * when the column is already there. A few visitors arriving together spin up a
 * few containers together, each grabbing exclusive locks on `users` while the
 * others are trying to read it — every request piles up behind the migration
 * and the site appears to go down. With the probe, a provisioned database costs
 * one indexed SELECT and no locks at all.
 */
export function setInitializer(
  fn: (db: Db) => Promise<void>,
  isUpToDate?: (db: Db) => Promise<boolean>
): void {
  initializer = fn;
  upToDate = isUpToDate ?? null;
}

const LOCK_KEY = 8140255301;

async function ensureReady(): Promise<void> {
  if (!initializer) return;
  if (readyPromise) return readyPromise;
  readyPromise = (async () => {
    let client: Awaited<ReturnType<PoolLike["connect"]>> | null = null;
    let locked = false;
    try {
      // Fast path: the schema is already at the version this build expects, so
      // there is nothing to run. No dedicated connection, no advisory lock, no
      // DDL — just one small read on the pool every container does once.
      if (upToDate) {
        const probe = makeDb(
          (text, values) => getPool().query(text, values as unknown[]),
          async () => {}
        );
        if (await upToDate(probe)) return;
      }
      client = await getPool().connect();
      const runInit = async () => {
        const rawDb = makeDb((text, values) => client!.query(text, values as unknown[]), async () => {});
        await initializer!(rawDb);
      };
      // Grab the init lock only if it's free — never block on it. Blocking was
      // the hazard: a lock left held on a pooled Neon session (or leaked from a
      // failed migration) would stall every cold instance's first query, so a
      // login could sit ~20s and then throw a server error while warm instances
      // served fine.
      const got = await client.query("SELECT pg_try_advisory_lock($1) AS ok", [LOCK_KEY]);
      locked = Boolean((got.rows[0] as { ok?: boolean } | undefined)?.ok);
      if (locked) {
        await runInit();
      } else {
        // Someone else holds it. If the schema is already provisioned — true on
        // any database that has served a request before — we are ready and must
        // not wait on a lock that might never free. Only a genuine first-ever
        // setup (no `users` table yet) is worth waiting for, and only briefly.
        const probe = await client.query("SELECT to_regclass('public.users') AS t");
        const provisioned = Boolean((probe.rows[0] as { t?: string | null } | undefined)?.t);
        if (!provisioned) {
          await client.query("SET lock_timeout = '10s'");
          await client.query("SELECT pg_advisory_lock($1)", [LOCK_KEY]);
          locked = true;
          await runInit();
        }
      }
    } catch (err) {
      readyPromise = null;
      throw err;
    } finally {
      if (client) {
        // Always release the advisory lock before the connection goes back to
        // the pool. A session-level lock left held on a pooled connection would
        // block every other instance's init until Neon eventually closes it —
        // so one migration error would 504 the whole site.
        if (locked) {
          await client.query("SELECT pg_advisory_unlock($1)", [LOCK_KEY]).catch(() => {});
        }
        await client.query("SET lock_timeout = DEFAULT").catch(() => {});
        client.release();
      }
    }
  })();
  return readyPromise;
}

const db: Db = makeDb(async (text, values) => getPool().query(text, values as unknown[]), ensureReady);

/** Synchronous handle; the schema is prepared lazily on the first query. */
export function getPg(): Db {
  return db;
}
