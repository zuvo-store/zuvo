export const dynamic = "force-dynamic";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { btnPrimary, cardCls } from "@/components/ui";
import ResetPasswordForm from "./ResetPasswordForm";

export const metadata = { title: "Reset password — ZUVO" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const user = await getSessionUser();
  if (user) redirect("/");

  const sp = await searchParams;
  const token = sp.token?.trim();

  if (!token) {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-10">
        <div className={`${cardCls} p-6 sm:p-8`}>
          <h1 className="text-2xl font-bold text-zinc-900">Invalid reset link</h1>
          <p className="mt-2 text-sm text-zinc-600">
            This password reset link is missing or incomplete. Reset links also expire 60 minutes
            after they are sent.
          </p>
          <Link
            href="/auth/forgot-password"
            className={`${btnPrimary} mt-6 inline-block`}
          >
            Request a new reset link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md px-4 py-10">
      <ResetPasswordForm token={token} />
    </div>
  );
}
