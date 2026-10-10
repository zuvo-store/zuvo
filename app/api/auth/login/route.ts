export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import {
  verifyPassword,
  normalizeEmail,
  isEmail,
  createSession,
  getGuestToken,
} from "@/lib/auth";
import { mergeGuestCartIntoUser } from "@/lib/cart";
import { audit } from "@/lib/audit";
import { rateLimitOr429, readJson } from "../../_helpers";

// Precomputed dummy hash so a login for a nonexistent account still costs a
// bcrypt comparison (avoids a timing leak about which accounts exist).
const DUMMY_HASH = bcrypt.hashSync("zuvo-dummy-password-that-never-matches", 10);

export async function POST(req: NextRequest) {
  const limited = rateLimitOr429(req, "login");
  if (limited) return limited;

  const body = await readJson(req);
  const identifier = String(body?.identifier ?? "").trim();
  const password = String(body?.password ?? "");
  const remember = body?.remember === true;

  if (!identifier || !password)
    return NextResponse.json(
      { ok: false, error: "Please enter your email or username and your password." },
      { status: 400 }
    );

  const user = isEmail(identifier)
    ? await db.user.findUnique({ where: { email: normalizeEmail(identifier) } })
    : await db.user.findUnique({ where: { username: identifier } });

  let valid = false;
  if (user) {
    valid = await verifyPassword(password, user.passwordHash);
  } else {
    // Dummy comparison so unknown accounts take the same time as real ones.
    await verifyPassword(password, DUMMY_HASH).catch(() => {});
  }

  if (!user || !valid)
    return NextResponse.json({ ok: false, error: "Invalid credentials." }, { status: 401 });

  await createSession(user.id, remember, req.headers.get("user-agent") ?? undefined);
  try {
    await mergeGuestCartIntoUser(user.id, await getGuestToken());
  } catch {
    // Cart merge must never break login.
  }

  await audit("auth.login", {
    actorId: user.id,
    entity: "User",
    entityId: user.id,
    meta: { remember },
  });

  return NextResponse.json({ ok: true });
}
