export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  createSession,
  hashPassword,
  normalizeEmail,
  randomToken,
  uniqueReferralCode,
} from "@/lib/auth";
import { ensureRewardForUser } from "@/lib/rewards";
import { audit } from "@/lib/audit";
import { OAUTH_STATE_COOKIE } from "../route";

function appUrl(): string {
  return (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

function safeNext(raw: string | null | undefined): string {
  if (raw && raw.startsWith("/") && !raw.startsWith("//")) return raw;
  return "/";
}

function fail(reason: string) {
  const url = new URL("/auth/login", appUrl());
  url.searchParams.set("error", reason);
  const res = NextResponse.redirect(url);
  res.cookies.delete(OAUTH_STATE_COOKIE);
  return res;
}

type GoogleUserInfo = {
  sub: string;
  name?: string;
  given_name?: string;
  email?: string;
  email_verified?: boolean;
  picture?: string;
};

/** Derive a unique username from the email local part (USERNAME_RE: 3–20 chars). */
async function uniqueUsernameFromEmail(email: string): Promise<string> {
  const base = (email.split("@")[0] || "user")
    .replace(/[^A-Za-z0-9_.-]/g, "")
    .slice(0, 14);
  const stem = (base.length >= 3 ? base : "user") + "";
  for (let i = 0; i < 10; i++) {
    const candidate = i === 0 ? stem : `${stem}${Math.floor(100 + Math.random() * 900)}`.slice(0, 20);
    const taken = await db.user.findUnique({ where: { username: candidate } });
    if (!taken) return candidate;
  }
  return `user${randomToken(4)}`.slice(0, 20);
}

/**
 * GET /api/auth/google/callback
 * Google redirects here after consent. Verifies state, exchanges the code,
 * finds or creates the user, creates the normal session, and redirects home.
 */
export async function GET(req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return fail("google_not_configured");

  const params = req.nextUrl.searchParams;
  if (params.get("error")) return fail("google_denied");

  const code = params.get("code");
  const returnedState = params.get("state");
  if (!code || !returnedState) return fail("google_failed");

  // --- CSRF check: state must match the cookie we set ---
  let cookieState: { state?: string; next?: string } = {};
  try {
    cookieState = JSON.parse(req.cookies.get(OAUTH_STATE_COOKIE)?.value || "{}");
  } catch {
    return fail("google_failed");
  }
  if (!cookieState.state || cookieState.state !== returnedState) return fail("google_failed");
  const next = safeNext(cookieState.next);

  const redirectUri = `${appUrl()}/api/auth/google/callback`;

  // --- Exchange code for tokens ---
  let accessToken: string | null = null;
  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }).toString(),
    });
    const tokenJson = (await tokenRes.json()) as { access_token?: string; error?: string };
    if (!tokenRes.ok || !tokenJson.access_token) return fail("google_failed");
    accessToken = tokenJson.access_token;
  } catch {
    return fail("google_failed");
  }

  // --- Fetch the Google profile ---
  let info: GoogleUserInfo;
  try {
    const meRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!meRes.ok) return fail("google_failed");
    info = (await meRes.json()) as GoogleUserInfo;
  } catch {
    return fail("google_failed");
  }

  const email = normalizeEmail(info.email || "");
  if (!email || info.email_verified !== true) return fail("google_unverified");

  const name = (info.name || info.given_name || email.split("@")[0] || "Google User").trim().slice(0, 120);

  // --- Find or create the user (never create a duplicate for an existing email) ---
  let user = await db.user.findUnique({ where: { email } });
  if (!user) {
    try {
      user = await db.user.create({
        data: {
          name,
          username: await uniqueUsernameFromEmail(email),
          email,
          // Unusable password — this account signs in via Google only.
          passwordHash: await hashPassword(randomToken(48)),
          role: "CUSTOMER",
          emailVerified: new Date(),
          provider: "google",
          referralCode: await uniqueReferralCode(),
        },
      });
      await ensureRewardForUser(user.id).catch(() => null);
      await audit("auth.google.signup", {
        actorId: user.id,
        entity: "User",
        entityId: user.id,
        meta: { email },
      }).catch(() => null);
    } catch (e: unknown) {
      // Race: someone created this email concurrently — fall through to login.
      if (typeof e === "object" && e !== null && (e as { code?: string }).code === "P2002") {
        user = await db.user.findUnique({ where: { email } });
        if (!user) return fail("google_failed");
      } else {
        return fail("google_failed");
      }
    }
  }

  // --- Same session cookie as normal login ---
  // createSession() sets the cookie via next/headers; Next.js applies
  // cookies set in a Route Handler to the returned response automatically.
  await createSession(user.id, true, req.headers.get("user-agent") ?? undefined);
  const res = NextResponse.redirect(new URL(next, appUrl()));
  res.cookies.delete(OAUTH_STATE_COOKIE);
  return res;
}
