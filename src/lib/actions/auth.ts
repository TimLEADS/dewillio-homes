"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import {
  createSession,
  destroySession,
  setSessionCookie,
  verifyPassword,
} from "@/lib/auth";
import { audit } from "@/lib/audit";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function loginAction(prevState: { error?: string } | undefined, formData: FormData) {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: "Enter a valid email and password." };
  }

  const db = getDb();
  const user = await db.prepare("SELECT * FROM users WHERE email = ?").get(parsed.data.email.toLowerCase()) as
    | { id: number; email: string; password_hash: string; role: string; status: string }
    | undefined;

  if (!user || !verifyPassword(parsed.data.password, user.password_hash)) {
    return { error: "Invalid email or password." };
  }

  const token = await createSession(user.id);
  await setSessionCookie(token);
  await audit(user.id, user.role, "login", "user", user.id);

  if (user.role === "agent") {
    redirect("/dashboard");
  }
  redirect("/admin");
}

export async function logoutAction() {
  const { getSessionUserFresh } = await import("@/lib/auth");
  const user = await getSessionUserFresh();
  if (user) await audit(user.id, user.role, "logout", "user", user.id);
  await destroySession();
  redirect("/");
}
