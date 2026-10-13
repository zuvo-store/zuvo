export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { randomToken } from "@/lib/auth";

export const OAUTH_STATE_COOKIE = "zuvo_oauth_state";
const STATE_TTL_SEC = 10 * 60;

function appUrl(): string {
  return (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

function safeNext(raw: string | null): string {
  if (raw && raw.startsWith("/") && !raw.startsWith("//")) return raw;
  return "/";
}

/**
 * GET /api/auth/google
 * Starts Google OAuth: sets a CSRF `state` cookie and redirects to Google.
 */
export async function GET(req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    const url = new URL("/auth/login", appUrl());
    url.searchParams.set("error", "google_not_configured");
    return NextResponse.redirect(url);
  }

  const next = safeNext(req.nextUrl.searchParams.get("next"));
  const state = randomToken(16);
  const redirectUri = `${appUrl()}/api/auth/google/callback`;

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "openid email profile");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("access_type", "online");
  authUrl.searchParams.set("prompt", "select_account");

  const res = NextResponse.redirect(authUrl.toString());
  res.cookies.set(OAUTH_STATE_COOKIE, JSON.stringify({ state, next }), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: STATE_TTL_SEC,
  });
  return res;
}
