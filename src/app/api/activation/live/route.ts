import { getSessionUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { activationDestination } from "@/lib/activation";
import { subscribeToActivation } from "@/lib/activationBus";

export const dynamic = "force-dynamic";

/**
 * Server-Sent Events stream of the applicant's activation stage. The browser
 * subscribes once and is pushed the instant an admin routes them from the
 * dashboard, so the loading screen turns over without client polling.
 *
 * The stream also re-checks the database on a slow fallback timer: on a
 * serverless fleet the in-process bus can't see a decision made on another
 * instance, so this guarantees the decision still arrives within seconds
 * anywhere. Between events the socket costs nothing.
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

      cleanup = () => {
        clearInterval(keepAlive);
        clearInterval(fallback);
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