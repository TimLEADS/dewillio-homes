type StageListener = (payload: { stage: string; destination: string }) => void;

interface Bus {
  listeners: Map<number, Set<StageListener>>;
}

/**
 * In-process pub/sub for activation stage changes, so applicant browsers on
 * `/api/activation/live` get pushed the moment an admin routes them — no
 * polling needed while the connection is up. Lives on `globalThis` because
 * Turbopack gives each module import its own copy; dev hot-reloads would
 * otherwise orphan the subscriber set.
 *
 * Works on any single-instance deployment. On serverless fleets (Vercel) the
 * SSE stream also re-checks the database on a slow timer, so a decision made on
 * a different instance still arrives within seconds.
 */
const GLOBAL_KEY = "__dewillioActivationBus";

function bus(): Bus {
  const g = globalThis as unknown as Record<string, Bus | undefined>;
  if (!g[GLOBAL_KEY]) g[GLOBAL_KEY] = { listeners: new Map() };
  return g[GLOBAL_KEY] as Bus;
}

export function subscribeToActivation(userId: number, listener: StageListener): () => void {
  const { listeners } = bus();
  let set = listeners.get(userId);
  if (!set) {
    set = new Set();
    listeners.set(userId, set);
  }
  set.add(listener);
  return () => {
    set!.delete(listener);
    if (set!.size === 0) listeners.delete(userId);
  };
}

export function publishActivation(userId: number, payload: { stage: string; destination: string }): void {
  const set = bus().listeners.get(userId);
  if (!set) return;
  set.forEach((listener) => {
    try {
      listener(payload);
    } catch {
      // A broken delivery must never fail the caller's transaction work.
    }
  });
}