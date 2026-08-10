/**
 * A local stand-in for Neon: a persisted in-process Postgres (PGlite) exposed
 * over the WebSocket transport `@neondatabase/serverless` speaks, so the app
 * runs with no Neon account, no Docker and no Postgres install.
 *
 *   npm run dev:db     # leave this running, then `npm run dev` alongside it
 *
 * Two hops, because the driver talks WebSocket while PGlite talks the Postgres
 * wire protocol over a socket:
 *
 *   neon driver --ws--> bridge (this file) --tcp--> PGLiteSocketServer --> PGlite
 *
 * Both listeners bind to loopback, and the bridge dials its own Postgres port
 * rather than the `?address=` the driver asks for, so this cannot be used as an
 * open proxy to somewhere else.
 */
import net from "node:net";
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { WebSocketServer } from "ws";

const DATA_DIR = process.env.PGLITE_DATA_DIR ?? "./data/pglite";
const PG_PORT = Number(process.env.PGLITE_PG_PORT ?? 5432);
const WS_PORT = Number(process.env.PGLITE_WS_PORT ?? 5433);
const HOST = "127.0.0.1";

const db = await PGlite.create({ dataDir: DATA_DIR });
await db.waitReady;

/**
 * PGlite is a single Postgres backend, so clients in overlapping transactions
 * share one session — a BEGIN on one can swallow the other's writes. The app
 * holds one connection at a time (`max: 1` on a per-process pool, see
 * src/lib/pg.ts) and PGlite serialises queries internally, so the real cost of
 * spare connections is low. The headroom matters because the cap is a cliff,
 * not a queue: once it is reached, every further connection is dropped as a
 * bare "Connection terminated unexpectedly", which reads like the database is
 * broken. Leave room for the one-shot scripts (`verify-db`, `import-backup`)
 * run alongside `next dev`, and for a dev server that has not yet released a
 * connection from a previous reload.
 */
const pgServer = new PGLiteSocketServer({
  db,
  host: HOST,
  port: PG_PORT,
  maxConnections: 20,
});
try {
  await pgServer.start();
} catch (err) {
  // Overwhelmingly this is a previous `npm run dev:db` that is still running.
  console.error(`[dev-db] cannot listen on ${HOST}:${PG_PORT} — ${err.message}`);
  process.exit(1);
}

const wss = new WebSocketServer({ host: HOST, port: WS_PORT });

/** Printed on every open/close: exhausting the cap above is otherwise silent. */
let live = 0;

wss.on("connection", (ws) => {
  const tcp = net.connect(PG_PORT, HOST);
  console.log(`[dev-db] client connected (${++live} open)`);

  // A dev server killed outright (rather than shut down) leaves its side of the
  // socket open here, and that connection would hold its slot forever. Ping
  // each client and drop the ones that stop answering.
  ws.isAlive = true;
  ws.on("pong", () => {
    ws.isAlive = true;
  });

  ws.on("message", (data) => tcp.write(data));
  tcp.on("data", (chunk) => {
    if (ws.readyState === ws.OPEN) ws.send(chunk);
  });

  ws.on("close", () => {
    console.log(`[dev-db] client disconnected (${--live} open)`);
    tcp.end();
  });
  tcp.on("close", () => {
    if (ws.readyState === ws.OPEN) ws.close();
  });

  // A dropped socket on either side is ordinary (dev server restart); log the
  // reason but never let it take the bridge process down.
  ws.on("error", (err) => {
    console.error("[dev-db] websocket error:", err.message);
    tcp.destroy();
  });
  tcp.on("error", (err) => {
    console.error("[dev-db] postgres socket error:", err.message);
    if (ws.readyState === ws.OPEN) ws.close();
  });
});

const heartbeat = setInterval(() => {
  for (const ws of wss.clients) {
    if (ws.isAlive === false) {
      console.log("[dev-db] dropping a client that stopped responding");
      ws.terminate();
      continue;
    }
    ws.isAlive = false;
    ws.ping();
  }
}, 15000);
heartbeat.unref();

wss.on("error", (err) => {
  console.error(`[dev-db] cannot listen on ${HOST}:${WS_PORT} — ${err.message}`);
  process.exit(1);
});

const url = `postgresql://postgres:postgres@${HOST}:${PG_PORT}/postgres`;
console.log(`[dev-db] PGlite ready, data in ${DATA_DIR}`);
console.log(`[dev-db] postgres ${HOST}:${PG_PORT}, websocket bridge ${HOST}:${WS_PORT}`);
console.log("[dev-db] .env.local should contain:");
console.log(`  DATABASE_URL="${url}"`);
console.log(`  PGLITE_WS_PROXY="${HOST}:${WS_PORT}"`);
console.log("[dev-db] listening — press Ctrl+C to stop");

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, async () => {
    console.log("\n[dev-db] shutting down");
    wss.close();
    await pgServer.stop();
    await db.close();
    process.exit(0);
  });
}
