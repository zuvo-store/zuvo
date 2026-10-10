export const dynamic = "force-dynamic";
import Link from "next/link";
import type { ReactNode } from "react";
import { db } from "@/lib/db";
import { sha256hex, getSessionUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { btnPrimary, cardCls } from "@/components/ui";
import ResendButton from "./ResendButton";

export const metadata = { title: "Verify your email — ZUVO" };

type Props = { searchParams: Promise<{ token?: string; verified?: string; error?: string }> };

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-md px-4 py-10">
      <div className={cardCls}>{children}</div>
    </div>
  );
}

export default async function VerifyEmailPage({ searchParams }: Props) {
  const sp = await searchParams;
  const token = sp.token?.trim();

  // Inline verification: look up the token directly, no self-fetch.
  if (token) {
    const rec = await db.emailToken.findUnique({ where: { tokenHash: sha256hex(token) } });
    const valid = rec && rec.type === "VERIFY" && !rec.usedAt && rec.expiresAt > new Date();

    if (valid && rec) {
      await db.emailToken.update({ where: { id: rec.id }, data: { usedAt: new Date() } });
      await db.user.update({ where: { id: rec.userId }, data: { emailVerified: new Date() } });
      await audit("auth.verify-email", { actorId: rec.userId, entity: "User", entityId: rec.userId });

      return (
        <Shell>
          <h1 className="text-2xl font-bold text-zinc-900">Email verified</h1>
          <p className="mt-2 text-sm text-zinc-600">
            Your email address has been verified. Your account is fully set up.
          </p>
          <Link href="/" className={`${btnPrimary} mt-6 inline-flex w-full justify-center`}>
            Start shopping
          </Link>
        </Shell>
      );
    }

    return (
      <Shell>
        <h1 className="text-2xl font-bold text-zinc-900">Link invalid or expired</h1>
        <p className="mt-2 text-sm text-zinc-600">
          This verification link is invalid, already used, or older than 24 hours. Sign in and
          request a fresh one below.
        </p>
        <ResendButton />
        <p className="mt-4 text-center text-sm text-zinc-600">
          <Link href="/auth/login" className="font-medium text-brand-700 underline">
            Back to sign in
          </Link>
        </p>
      </Shell>
    );
  }

  if (sp.verified === "1") {
    const user = await getSessionUser();
    return (
      <Shell>
        <h1 className="text-2xl font-bold text-zinc-900">Email verified</h1>
        <p className="mt-2 text-sm text-zinc-600">
          {user ? `Thanks, ${user.name} — your email address is verified.` : "Your email address has been verified."}
        </p>
        <Link href="/" className={`${btnPrimary} mt-6 inline-flex w-full justify-center`}>
          Start shopping
        </Link>
      </Shell>
    );
  }

  if (sp.error) {
    return (
      <Shell>
        <h1 className="text-2xl font-bold text-zinc-900">Link invalid or expired</h1>
        <p className="mt-2 text-sm text-zinc-600">
          This verification link is invalid, already used, or older than 24 hours.
        </p>
        <ResendButton />
        <p className="mt-4 text-center text-sm text-zinc-600">
          <Link href="/auth/login" className="font-medium text-brand-700 underline">
            Back to sign in
          </Link>
        </p>
      </Shell>
    );
  }

  return (
    <Shell>
      <h1 className="text-2xl font-bold text-zinc-900">Verify your email</h1>
      <p className="mt-2 text-sm text-zinc-600">
        We sent you a verification link when you created your account. Click the link in that
        message (it is valid for 24 hours) to verify your email address.
      </p>
      <ResendButton />
      <p className="mt-4 text-center text-sm text-zinc-600">
        <Link href="/auth/login" className="font-medium text-brand-700 underline">
          Back to sign in
        </Link>
      </p>
    </Shell>
  );
}
