import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { createHash, createHmac, randomBytes } from "crypto";
import { db } from "./db";

export const SESSION_COOKIE = "zuvo_session";
export const GUEST_COOKIE = "zuvo_guest";

function secret(): string {
  return process.env.SESSION_SECRET || "zuvo-dev-secret-change-me";
}

// ------------------------------------------------------------------ primitives
export async function hashPassword(pw: string): Promise<string> {
  return bcrypt.hash(pw, 12);
}

export async function verifyPassword(pw: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pw, hash);
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("hex");
}

/** 6-digit numeric OTP for email verification. */
export function randomOtp(): string {
  return String(randomBytes(4).readUInt32BE(0) % 900000 + 100000);
}

export function sha256hex(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

function sign(value: string): string {
  return createHmac("sha256", secret()).update(value).digest("hex");
}

function signed(value: string): string {
  return `${value}.${sign(value)}`;
}

function verifySigned(s: string | undefined): string | null {
  if (!s) return null;
  const i = s.lastIndexOf(".");
  if (i <= 0) return null;
  const value = s.slice(0, i);
  const sig = s.slice(i + 1);
  const expected = sign(value);
  if (sig.length !== expected.length) return null;
  // constant-time-ish compare
  let diff = 0;
  for (let k = 0; k < sig.length; k++) diff |= sig.charCodeAt(k) ^ expected.charCodeAt(k);
  if (diff !== 0) return null;
  return value;
}

// ------------------------------------------------------------------ sessions
export async function createSession(userId: string, remember: boolean, userAgent?: string) {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + (remember ? 30 : 1) * 24 * 3600 * 1000);
  await db.session.create({
    data: { userId, tokenHash: sha256hex(token), expiresAt, userAgent: userAgent ?? null },
  });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, signed(token), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const raw = verifySigned(jar.get(SESSION_COOKIE)?.value);
  if (raw) {
    await db.session.deleteMany({ where: { tokenHash: sha256hex(raw) } });
  }
  jar.delete(SESSION_COOKIE);
}

export type SessionUser = {
  id: string;
  name: string;
  username: string;
  email: string;
  role: string;
  provider: string;
  emailVerified: Date | null;
  referralCode: string;
  createdAt: Date;
};

export async function getSessionUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const raw = verifySigned(jar.get(SESSION_COOKIE)?.value);
  if (!raw) return null;
  const s = await db.session.findUnique({
    where: { tokenHash: sha256hex(raw) },
    include: { user: true },
  });
  if (!s) return null;
  if (s.expiresAt < new Date()) {
    await db.session.delete({ where: { id: s.id } }).catch(() => {});
    return null;
  }
  const u = s.user;
  return {
    id: u.id,
    name: u.name,
    username: u.username,
    email: u.email,
    role: u.role,
    provider: u.provider,
    emailVerified: u.emailVerified,
    referralCode: u.referralCode,
    createdAt: u.createdAt,
  };
}

export async function requireUser(next?: string): Promise<SessionUser> {
  const u = await getSessionUser();
  if (!u) redirect(`/auth/login${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  return u;
}

/**
 * Call FIRST in every admin page component, before any data fetch.
 * Layout-level admin checks race with concurrent page rendering, so the
 * page-level guard is authoritative: anonymous users go to login,
 * non-admins go home. The AdminShell stays as a backstop.
 */
export async function requireAdminPage(): Promise<SessionUser> {
  const u = await getSessionUser();
  if (!u) redirect("/auth/login?next=/admin");
  if (u.role !== "ADMIN") redirect("/");
  return u;
}

// ------------------------------------------------------------------ guest token (cart ownership for non-logged-in users)
// NOTE (Next 16): cookies may only be *set* in Route Handlers / Server Actions,
// never during a Server Component render. The edge proxy (proxy.ts) issues the
// cookie on the way in, so it virtually always exists here. The try/catch is a
// safety net: if somehow missing during a render, fall back to an ephemeral
// token so reads still work instead of crashing the page.
export async function getGuestToken(): Promise<string> {
  const jar = await cookies();
  const existing = jar.get(GUEST_COOKIE)?.value;
  if (existing && /^[a-f0-9]{32}$/.test(existing)) return existing;
  const t = randomToken(16);
  try {
    jar.set(GUEST_COOKIE, t, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  } catch {
    /* render context — the proxy issues the cookie on the next pass */
  }
  return t;
}

// ------------------------------------------------------------------ helpers
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function makeReferralCode(length = 8): string {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  return out;
}

export async function uniqueReferralCode(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const code = makeReferralCode();
    const exists = await db.user.findUnique({ where: { referralCode: code } });
    if (!exists) return code;
  }
  return makeReferralCode(12);
}

export function passwordIssues(pw: string): string[] {
  const issues: string[] = [];
  if (pw.length < 8) issues.push("Password must be at least 8 characters.");
  if (!/[a-zA-Z]/.test(pw)) issues.push("Password must include a letter.");
  if (!/[0-9]/.test(pw)) issues.push("Password must include a number.");
  return issues;
}

export function isEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

// ------------------------------------------------------------------ simple in-memory rate limiter (per-instance, demo-grade)
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, maxAttempts: number, windowMs: number): { ok: boolean; retryAfterSec: number } {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSec: 0 };
  }
  if (b.count >= maxAttempts) {
    return { ok: false, retryAfterSec: Math.ceil((b.resetAt - now) / 1000) };
  }
  b.count += 1;
  return { ok: true, retryAfterSec: 0 };
}
