import { getSessionUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { activationDestination } from "@/lib/activation";
import { subscribeToActivation } from "@/lib/activationBus";

export const dynamic = "force-dynamic";

// Cap the function so a stream can never run to the platform's hard limit and
// return FUNCTION_INVOCATION_TIMEOUT (504). We self-close well inside this.
export const maxDuration = 60;

/** Close each stream after this long and let EventSource reconnect. Must stay
 *  comfortably below `maxDuration` so the function returns cleanly rather than
 *  being killed by the platform. */
const STREAM_TTL_MS = 25000;

/**
 * Server-Sent Events stream of the applicant's activation stage. The browser
 * subscribes once and is pushed the instant an admin routes them from the
 * dashboard, so the loading screen turns over without client polling.
 *
 * The stream also re-checks the database on a slow fallback timer: on a
 * serverless fleet the in-process bus can't see a decision made on another
 * instance, so this guarantees the decision still arrives within seconds
 * anywhere. Between events the socket costs nothing.
 *
 * Each connection lives at most `STREAM_TTL_MS` and then closes itself; the
 * browser's EventSource reconnects transparently. That keeps every invocation
 * short-lived on serverless — a stream can't pin a function (or its pooled DB
 * connection) open until the platform times it out.
 */
export async function GET() {
  const user = await getSessionUser();
  if (!user || user.role !== "agent") {
    return new Response("unauthorized", { status: 401 });
  }

  const readStage = async () => {
    const row = (await getDb()
      .prepare("SELECT activation_stage FROM users WHERE id = ?")
      .get(user.id)) as { activation_stage: string | null } | undefined;
    const stage = row?.activation_stage ?? "approved";
    return { stage, destination: activationDestination(stage) };
  };

  let last: string | null = null;
  let cleanup: (() => void) | null = null;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (payload: { stage: string; destination: string }) => {
        if (payload.stage === last) return;
        last = payload.stage;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      };
      const ping = () => {
        try {
          controller.enqueue(encoder.encode(`: ping ${Date.now()}\n\n`));
        } catch {
          /* socket already closed */
        }
      };

      send(await readStage());

      const unsubscribe = subscribeToActivation(user.id, send);

      const keepAlive = setInterval(ping, 20000);
      const fallback = setInterval(async () => {
        try {
          send(await readStage());
        } catch {
          /* DB hiccup — next tick tries again */
        }
      }, 15000);

      // Retire the stream before the platform's function limit. The browser
      // reconnects on its own, and the 15s poll in useActivationLive covers the
      // gap, so the applicant never notices the handover.
      const retire = setTimeout(() => {
        cleanup?.();
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      }, STREAM_TTL_MS);

      let done = false;
      cleanup = () => {
        if (done) return;
        done = true;
        clearInterval(keepAlive);
        clearInterval(fallback);
        clearTimeout(retire);
        unsubscribe();
      };
    },
    cancel() {
      // Browser closed, tab gone, or EventSource closed the connection:
      // drop the bus slot and timers so nothing lingers.
      cleanup?.();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store, no-cache, must-revalidate",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}