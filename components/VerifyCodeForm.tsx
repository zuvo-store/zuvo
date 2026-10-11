"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { btnPrimary, inputCls, cardCls, FormError } from "@/components/ui";

/**
 * 6-digit email OTP entry. Used after signup and when an unverified user
 * tries to sign in. On success the user is logged in (session cookie set
 * by the API) and sent home.
 */
export default function VerifyCodeForm({
  email,
  demoCode,
  title = "Check your email",
}: {
  email: string;
  demoCode?: string | null;
  title?: string;
}) {
  const router = useRouter();
  const [code, setCode] = useState(demoCode ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [showDemoCode, setShowDemoCode] = useState<string | null>(demoCode ?? null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, []);

  function startCooldown() {
    setCooldown(30);
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1 && timer.current) clearInterval(timer.current);
        return Math.max(0, c - 1);
      });
    }, 1000);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^\d{6}$/.test(code.trim())) {
      setError("Please enter the 6-digit code.");
      return;
    }
    setPending(true);
    try {
      const res = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "Could not verify the code. Please try again.");
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  async function onResend() {
    setError(null);
    setResent(false);
    setResending(true);
    try {
      const res = await fetch("/api/auth/resend-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "Could not resend the code. Please try again.");
        return;
      }
      setResent(true);
      setShowDemoCode(data.demoCode ?? null);
      setCode(data.demoCode ?? "");
      startCooldown();
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setResending(false);
    }
  }

  return (
    <div className={cardCls}>
      <h1 className="text-2xl font-bold text-zinc-900">{title}</h1>
      <p className="mt-2 text-sm text-zinc-600">
        We sent a <span className="font-semibold text-zinc-900">6-digit verification code</span> to{" "}
        <span className="font-semibold text-zinc-900">{email}</span>. Enter it below to verify
        your account. The code expires in 10 minutes.
      </p>

      {showDemoCode ? (
        <div className="mt-4 rounded-xl border border-dashed border-amber-400 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-800">Demo mode: email sending not configured</p>
          <p className="mt-1 text-sm text-amber-700">
            In production this code would arrive by email. For this demo, use it directly:
          </p>
          <p className="mt-2 text-2xl font-extrabold tracking-[0.3em] text-amber-900">{showDemoCode}</p>
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="otp-code" className="mb-1 block text-sm font-medium text-zinc-700">
            Verification code
          </label>
          <input
            id="otp-code"
            className={`${inputCls} text-center text-2xl font-extrabold tracking-[0.4em]`}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="••••••"
            maxLength={6}
            required
          />
        </div>

        {error && <FormError message={error} />}
        {resent && !error && (
          <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            A new code was sent to your email.
          </p>
        )}

        <button type="submit" disabled={pending} className={`${btnPrimary} w-full`}>
          {pending ? "Verifying…" : "Verify & continue"}
        </button>

        <p className="text-center text-sm text-zinc-600">
          Didn&apos;t get the code?{" "}
          <button
            type="button"
            onClick={onResend}
            disabled={resending || cooldown > 0}
            className="font-medium text-brand-700 underline disabled:text-zinc-400 disabled:no-underline"
          >
            {resending ? "Sending…" : cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
          </button>
        </p>
      </form>
    </div>
  );
}
