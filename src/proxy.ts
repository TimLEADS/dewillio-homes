import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Until a database is attached, every page would throw when it tried to query.
 * Rewriting to /setup turns that into readable instructions instead of a crash,
 * so the very first deploy renders cleanly.
 */
export function proxy(request: NextRequest) {
  if (process.env.DATABASE_URL) return NextResponse.next();
  if (request.nextUrl.pathname === "/setup") return NextResponse.next();
  return NextResponse.rewrite(new URL("/setup", request.url));
}

export const config = {
  // Skip Next internals and static assets, so the setup page keeps its styles.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
