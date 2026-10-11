"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { btnPrimary, inputCls, cardCls, Field, FormError } from "@/components/ui";

export default function ResetPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, confirmPassword }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "Could not reset your password. The link may have expired.");
        return;
      }
      setDone(true);
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <div className={`${cardCls} p-6 sm:p-8`}>
        <h1 className="text-2xl font-bold text-zinc-900">Password updated</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Your password has been changed. You have been signed out of all devices for security.
        </p>
        <Link href="/auth/login" className={`${btnPrimary} mt-6 inline-flex w-full justify-center`}>
          Sign in with your new password
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className={`${cardCls} p-6 sm:p-8`}>
      <h1 className="text-2xl font-bold text-zinc-900">Choose a new password</h1>
      <p className="mt-1 text-sm text-zinc-600">Enter a new password for your account.</p>

      <div className="mt-6 space-y-4">
        <Field label="New password">
          <input
            className={inputCls}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            placeholder="Min. 8 chars, letter + number"
            required
          />
        </Field>
        <Field label="Confirm new password">
          <input
            className={inputCls}
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            placeholder="Repeat your new password"
            required
          />
        </Field>

        {error && <FormError message={error} />}

        <button type="submit" disabled={pending} className={`${btnPrimary} w-full`}>
          {pending ? "Updating…" : "Set new password"}
        </button>
      </div>
    </form>
  );
}
