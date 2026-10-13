"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { btnPrimary, inputCls, cardCls, Field, FormError } from "@/components/ui";
import VerifyCodeForm from "@/components/VerifyCodeForm";

export default function LoginForm({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [verifyEmail, setVerifyEmail] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password, remember }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        if (data.needsVerification && data.email) {
          // Trigger a fresh code, then show the OTP screen.
          try {
            await fetch("/api/auth/resend-code", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email: data.email }),
            });
          } catch {
            /* non-fatal; user can resend manually */
          }
          setVerifyEmail(data.email as string);
          return;
        }
        setError(data.error || "Could not sign you in. Please try again.");
        return;
      }
      router.push(nextPath);
      router.refresh();
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  if (verifyEmail) {
    return <VerifyCodeForm email={verifyEmail} title="Verify your email" />;
  }

  return (
    <form onSubmit={onSubmit} className={`${cardCls} p-6 sm:p-8`}>
      <h1 className="text-2xl font-bold text-zinc-900">Sign in</h1>
      <p className="mt-1 text-sm text-zinc-600">Welcome back to ZUVO.</p>

      <div className="mt-6 space-y-4">
        <Field label="Email or username">
          <input
            className={inputCls}
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            autoComplete="username"
            placeholder="you@example.com"
            required
          />
        </Field>

        <Field label="Password">
          <input
            className={inputCls}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            placeholder="Your password"
            required
          />
        </Field>

        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 text-zinc-700">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 accent-brand-600"
            />
            Remember me
          </label>
          <Link href="/auth/forgot-password" className="font-medium text-brand-700 underline">
            Forgot password?
          </Link>
        </div>

        {error && <FormError message={error} />}

        <button type="submit" disabled={pending} className={`${btnPrimary} w-full`}>
          {pending ? "Signing you in…" : "Sign in"}
        </button>

        <div className="my-1 flex items-center gap-3 text-xs text-zinc-400">
          <span className="h-px flex-1 bg-zinc-200" />
          New to ZUVO?
          <span className="h-px flex-1 bg-zinc-200" />
        </div>

        <Link
          href={nextPath && nextPath !== "/" ? `/auth/signup?next=${encodeURIComponent(nextPath)}` : "/auth/signup"}
          className="inline-flex w-full justify-center rounded-xl border-2 border-orange-500 px-4 py-2.5 text-sm font-bold text-orange-600 hover:bg-orange-50"
        >
          Create an account
        </Link>
        <p className="text-xs text-zinc-500">
          An account is required to shop — your cart, orders and rewards stay saved.
        </p>
      </div>
    </form>
  );
}
