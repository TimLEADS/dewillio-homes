/**
 * Best-effort live streaming of the checkout form to the admin dashboard.
 * Fired as the applicant types — before any account or session exists — so the
 * write is keyed by an anonymous token rather than a logged-in user.
 */
export function sendCheckoutPatch(token: string, patch: Record<string, string | undefined>): void {
  if (!token) return;
  try {
    void fetch("/api/checkout/live", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, patch }),
      keepalive: true,
    });
  } catch {
    // A dropped keystroke is fine — the next one carries the full field again.
  }
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
