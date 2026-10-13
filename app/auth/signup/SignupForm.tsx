"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { btnPrimary, inputCls, cardCls, Field, FormError } from "@/components/ui";
import VerifyCodeForm from "@/components/VerifyCodeForm";

export default function SignupForm({ initialRef, nextPath }: { initialRef: string; nextPath: string }) {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [referralCode, setReferralCode] = useState(initialRef);
  const [terms, setTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [verifyEmail, setVerifyEmail] = useState<string | null>(null);
  const [demoCode, setDemoCode] = useState<string | null>(null);
  const visitRecorded = useRef(false);

  // Record the referral-link visit once on mount.
  useEffect(() => {
    if (visitRecorded.current || !initialRef) return;
    visitRecorded.current = true;
    fetch("/api/referrals/visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: initialRef }),
    }).catch(() => {});
  }, [initialRef]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setWarning(null);
    setPending(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fullName,
          username,
          email,
          password,
          confirmPassword,
          referralCode: referralCode.trim() || undefined,
          terms,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "Could not create your account. Please try again.");
        return;
      }
      if (data.referralWarning) setWarning(data.referralWarning);
      if (data.needsCode) {
        setVerifyEmail(data.email as string);
        setDemoCode((data.demoCode as string) ?? null);
      } else {
        router.push(nextPath);
        router.refresh();
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  if (verifyEmail) {
    return <VerifyCodeForm email={verifyEmail} demoCode={demoCode} title="Verify your email" mode="signup" />;
  }

  return (
    <form onSubmit={onSubmit} className={`${cardCls} p-6 sm:p-8`}>
      <h1 className="text-2xl font-bold text-zinc-900">Create your account</h1>
      <p className="mt-1 text-sm text-zinc-600">
        Join ZUVO to check out faster, track orders, and earn rewards.
      </p>

      <div className="mt-6 space-y-4">
        <Field label="Full name">
          <input
            className={inputCls}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            autoComplete="name"
            placeholder="Jane Doe"
            required
          />
        </Field>

        <Field label="Username">
          <input
            className={inputCls}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            placeholder="janedoe"
            required
          />
        </Field>

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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Password">
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
          <Field label="Confirm password">
            <input
              className={inputCls}
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              placeholder="Repeat your password"
              required
            />
          </Field>
        </div>

        <Field label="Referral code (optional)">
          <div className="flex gap-2">
            <input
              className={inputCls}
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value)}
              placeholder="e.g. SUMMER2K26"
            />
            {referralCode && (
              <button
                type="button"
                onClick={() => setReferralCode("")}
                className="shrink-0 rounded-xl border border-zinc-300 px-3 text-sm font-medium text-zinc-600 hover:bg-zinc-100"
              >
                Remove
              </button>
            )}
          </div>
          {initialRef && (
            <p className="mt-1 text-xs text-zinc-500">
              Prefilled from your invite link — you can edit or remove it.
            </p>
          )}
        </Field>

        <label className="flex items-start gap-2 text-sm text-zinc-700">
          <input
            type="checkbox"
            checked={terms}
            onChange={(e) => setTerms(e.target.checked)}
            className="mt-1 h-4 w-4 accent-brand-600"
            required
          />
          <span>
            I agree to the{" "}
            <Link href="/terms" className="font-medium text-brand-700 underline">
              Terms of Service
            </Link>
            .
          </span>
        </label>

        {warning && (
          <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">{warning}</p>
        )}
        {error && <FormError message={error} />}

        <button type="submit" disabled={pending} className={`${btnPrimary} w-full`}>
          {pending ? "Creating your account…" : "Create account"}
        </button>

        <p className="text-center text-sm text-zinc-600">
          Already have an account?{" "}
          <Link href="/auth/login" className="font-medium text-brand-700 underline">
            Sign in
          </Link>
        </p>
      </div>
    </form>
  );
}
