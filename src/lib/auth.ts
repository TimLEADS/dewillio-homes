import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { getDb } from "./db";
import type { AgentProfile, Role, User } from "./types";

export const SESSION_COOKIE = "dw_session";
export const SESSION_TTL_DAYS = 30;

export interface SessionUser extends Omit<User, "password_hash"> {
  profile: AgentProfile | null;
}

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

export function verifyPassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

export async function createSession(userId: number): Promise<string> {
  const db = getDb();
  const token = crypto.randomBytes(32).toString("hex");
  const now = new Date();
  const expires = new Date(now.getTime() + SESSION_TTL_DAYS * 86400000);
  await db.prepare("INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)").run(
    token,
    userId,
    now.toISOString(),
    expires.toISOString()
  );
  return token;
}

export async function setSessionCookie(token: string): Promise<void> {
  const c = await cookies();
  c.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_DAYS * 86400,
    secure: process.env.NODE_ENV === "production",
  });
}

export async function destroySession(): Promise<void> {
  const c = await cookies();
  const token = c.get(SESSION_COOKIE)?.value;
  if (token) {
    await getDb().prepare("DELETE FROM sessions WHERE token = ?").run(token);
  }
  c.delete(SESSION_COOKIE);
}

/**
 * Session, user and profile in a single round-trip. `agent_profiles` is all
 * TEXT/INTEGER, so `row_to_json` hands back exactly the shape `SELECT *` did.
 */
async function loadSessionUser(): Promise<SessionUser | null> {
  const c = await cookies();
  const token = c.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const db = getDb();
  const session = (await db
    .prepare(
      `SELECT s.expires_at, u.id, u.email, u.role, u.status, u.activated, u.license_verified,
              u.market_approved, u.onboarding_completed, u.agreement_accepted_at, u.agreement_version,
              u.created_at, u.updated_at, row_to_json(p) AS profile
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       LEFT JOIN agent_profiles p ON p.user_id = u.id
       WHERE s.token = ?`
    )
    .get(token)) as (User & { expires_at: string; profile: AgentProfile | null }) | undefined;
  if (!session) return null;
  if (new Date(session.expires_at).getTime() < Date.now()) {
    await db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
    return null;
  }
  return {
    id: session.id,
    email: session.email,
    role: session.role,
    status: session.status,
    activated: session.activated,
    license_verified: session.license_verified,
    market_approved: session.market_approved,
    onboarding_completed: session.onboarding_completed,
    agreement_accepted_at: session.agreement_accepted_at,
    agreement_version: session.agreement_version,
    created_at: session.created_at,
    updated_at: session.updated_at,
    profile: session.profile ?? null,
  };
}

/**
 * Uncached read, for server actions. An action and the re-render that follows
 * it share one request, so an action must not seed the request cache with a
 * snapshot taken before its own writes.
 */
export const getSessionUserFresh = loadSessionUser;

/**
 * Request-scoped read for layouts, pages and route handlers. Every protected
 * route calls `requireX()` in the layout and again in the page; without this
 * that is two identical session lookups on the critical path of every
 * navigation.
 */
export const getSessionUser = cache(loadSessionUser);

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireRoles(roles: Role[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) {
    if (user.role === "agent") redirect("/dashboard");
    redirect("/admin");
  }
  return user;
}

export async function requireAgent(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "agent") redirect("/admin");
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role === "agent") redirect("/dashboard");
  return user;
}
