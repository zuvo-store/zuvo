import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Edge proxy: guarantees every visitor has a `zuvo_guest` cart token cookie
 * before any page or API route runs. Next 16 forbids *setting* cookies during
 * Server Component renders, so issuance happens here instead of in lib code.
 */
function randomHex(bytes = 16): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function proxy(req: NextRequest) {
  const res = NextResponse.next();
  if (!req.cookies.get("zuvo_guest")) {
    res.cookies.set("zuvo_guest", randomHex(), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
