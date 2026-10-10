"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { btnPrimary, inputCls, cardCls, Field } from "@/components/ui";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [demoLink, setDemoLink] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setDemoLink(null);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.demoResetLink) setDemoLink(data.demoResetLink as string);
    } catch {
      // The message stays the same either way — never reveal account existence.
    } finally {
      setPending(false);
      setDone(true);
    }
  }

  return (
    <div className={cardCls}>
      <h1 className="text-2xl font-bold text-zinc-900">Reset your password</h1>
      {!done ? (
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <p className="text-sm text-zinc-600">
            Enter the email address you used to sign up and we will send you a reset link.
          </p>
          <Field label="Email address">
            <input
              className={inputCls}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="you@example.com"
              required
            />
          </Field>
          <button type="submit" disabled={pending} className={`${btnPrimary} w-full`}>
            {pending ? "Sending…" : "Send reset link"}
          </button>
          <p className="text-center text-sm text-zinc-600">
            <Link href="/auth/login" className="font-medium text-brand-700 underline">
              Back to sign in
            </Link>
          </p>
        </form>
      ) : (
        <div className="mt-6 space-y-4">
          <p className="rounded-xl bg-zinc-100 px-4 py-3 text-sm text-zinc-700">
            If an account exists for that email address, a reset link was sent. It expires in 60
            minutes.
          </p>
          {demoLink && (
            <div className="rounded-xl border border-dashed border-amber-400 bg-amber-50 p-4">
              <p className="text-sm font-semibold text-amber-800">Demo mode — no real email sent</p>
              <a
                href={demoLink}
                className="mt-2 block break-all text-sm font-medium text-brand-700 underline"
              >
                {demoLink}
              </a>
            </div>
          )}
          <p className="text-center text-sm text-zinc-600">
            <Link href="/auth/login" className="font-medium text-brand-700 underline">
              Back to sign in
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}
