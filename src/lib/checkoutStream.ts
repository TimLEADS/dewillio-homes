/**
 * Best-effort live streaming of the checkout form to the admin dashboard.
 * Fired as the applicant types — before any account or session exists — so the
 * write is keyed by an anonymous token rather than a logged-in user.
 *
 * Every patch is a database write on a connection shared by the whole site, so
 * this module is deliberately stingy with them. Three rules keep a fast typist
 * from turning into a write storm:
 *
 *   1. One request in flight at a time. Further patches merge into a pending
 *      one and go out when the current request lands, so a slow network makes
 *      the stream coarser instead of piling requests up behind each other.
 *   2. Nothing is sent twice. A patch identical to the last one that succeeded
 *      is dropped — several fields settling on the same values costs no writes.
 *   3. Patches merge rather than queue, so what finally goes out is the newest
 *      state of every field, not a replay of each keystroke.
 *
 * Callers should still debounce their own effects; this is the floor under
 * them, not a replacement. A dropped patch is always safe — the next one
 * carries the full current value of every field it touches.
 */

type Patch = Record<string, string | undefined>;

let inFlight = false;
let pending: Patch | null = null;
let pendingToken = "";
/** Body of the last patch that reached the server, to skip identical repeats. */
let lastSent = "";

function post(body: string): Promise<unknown> {
  return fetch("/api/checkout/live", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    // Survives the page being closed mid-checkout, so the last state still lands.
    keepalive: true,
  });
}

async function flush(): Promise<void> {
  if (inFlight || !pending) return;

  const patch = pending;
  pending = null;
  const body = JSON.stringify({ token: pendingToken, patch });
  if (body === lastSent) return;

  inFlight = true;
  try {
    await post(body);
    lastSent = body;
  } catch {
    // Offline for a beat. The value isn't lost: the next patch carries the
    // full current state of every field, so it lands with the following write.
  } finally {
    inFlight = false;
    if (pending) void flush();
  }
}

export function sendCheckoutPatch(token: string, patch: Patch): void {
  if (!token) return;
  pendingToken = token;
  // Merge, so a field that changed while a request was in flight is not lost
  // and an older value never overwrites a newer one.
  pending = { ...(pending ?? {}), ...patch };
  void flush();
}

/** Reuse one token per browser so a refresh mid-checkout keeps the same session. */
export function getCheckoutToken(): string {
  const KEY = "dw_checkout_token";
  try {
    const existing = localStorage.getItem(KEY);
    if (existing) return existing;
  } catch {
    /* storage blocked — fall through to an in-memory token */
  }
  const token =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID().replace(/-/g, "")
      : `t${Date.now().toString(36)}${Math.floor(Math.random() * 1e9).toString(36)}`;
  try {
    localStorage.setItem(KEY, token);
  } catch {
    /* ignore */
  }
  return token;
}
