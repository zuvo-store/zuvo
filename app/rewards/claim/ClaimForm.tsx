"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { btnPrimary, inputCls, cardCls, Field, FormError } from "@/components/ui";
import { formatUSD } from "@/lib/money";

const COUNTRIES = [
  "United States",
  "United Kingdom",
  "Canada",
  "Australia",
  "Germany",
  "France",
  "Netherlands",
  "Spain",
  "Italy",
  "Sweden",
  "United Arab Emirates",
  "Saudi Arabia",
  "India",
  "Pakistan",
  "Singapore",
  "Other",
];

export default function ClaimForm({
  defaultName,
  defaultEmail,
  amountCents,
}: {
  defaultName: string;
  defaultEmail: string;
  amountCents: number;
}) {
  const [fullName, setFullName] = useState(defaultName);
  const [email, setEmail] = useState(defaultEmail);
  const [country, setCountry] = useState("");
  const [phone, setPhone] = useState("");
  const [terms, setTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [claimed, setClaimed] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/rewards/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, email, country, phone: phone.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "Could not claim your reward. Please try again.");
        return;
      }
      setClaimed(true);
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  if (claimed) {
    return (
      <div className={cardCls}>
        <h1 className="text-2xl font-bold text-zinc-900">Reward claimed</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Your {formatUSD(amountCents)} welcome reward is now marked as claimed on your account.
          This is a simulated demonstration — no real money was paid out or charged.
        </p>
        <Link href="/account/rewards" className={`${btnPrimary} mt-6 inline-flex`}>
          View in your account
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className={cardCls}>
      <h1 className="text-2xl font-bold text-zinc-900">
        Claim your {formatUSD(amountCents)} welcome reward
      </h1>
      <p className="mt-1 text-sm text-zinc-600">
        Tell us where to record this simulated reward. It takes less than a minute.
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

        <Field label="Country">
          <select
            className={inputCls}
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            required
          >
            <option value="" disabled>
              Select your country
            </option>
            {COUNTRIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Phone (optional)">
          <input
            className={inputCls}
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoComplete="tel"
            placeholder="+1 555 010 2030"
          />
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
            I have read and accept the{" "}
            <Link href="/rewards/terms" className="font-medium text-brand-700 underline">
              reward terms
            </Link>
            .
          </span>
        </label>

        {error && <FormError message={error} />}

        <div className="rounded-xl border border-dashed border-amber-400 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-800">Simulated demonstration</p>
          <p className="mt-1 text-sm text-amber-700">
            This reward has no cash value. Nothing is paid out, withdrawn, or charged — claiming is
            free and only records a demo reward on your account.
          </p>
        </div>

        <button type="submit" disabled={pending} className={`${btnPrimary} w-full`}>
          {pending ? "Claiming…" : `Claim ${formatUSD(amountCents)}`}
        </button>
      </div>
    </form>
  );
}
