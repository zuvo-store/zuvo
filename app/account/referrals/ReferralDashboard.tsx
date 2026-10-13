"use client";

import { useState } from "react";
import type { ReferralDashboard } from "@/lib/referrals";
import { cardCls } from "@/components/ui";

type Props = {
  dashboard: ReferralDashboard;
  shareUrl: string;
};

export default function ReferralDashboardClient({ dashboard, shareUrl }: Props) {
  const [copied, setCopied] = useState<string | null>(null);

  async function copy(text: string, which: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(which);
    window.setTimeout(() => setCopied(null), 2000);
  }

  async function share() {
    const data = {
      title: "Join me on ZUVO",
      text: `Shop smarter on ZUVO — sign up with my referral link:`,
      url: shareUrl,
    };
    if (navigator.share) {
      try {
        await navigator.share(data);
      } catch {
        // user dismissed the share sheet
      }
    } else {
      await copy(shareUrl, "link");
    }
  }

  const stats = [
    {
      label: "Link visits",
      value: dashboard.visits,
      icon: "👁️",
      gradient: "from-sky-500 to-blue-600",
    },
    {
      label: "Signups",
      value: dashboard.signups,
      icon: "🎉",
      gradient: "from-emerald-500 to-green-600",
    },
    {
      label: "Pending",
      value: dashboard.pending,
      icon: "⏳",
      gradient: "from-amber-500 to-orange-600",
    },
    {
      label: "Eligible",
      value: dashboard.eligible,
      icon: "✅",
      gradient: "from-violet-500 to-purple-600",
    },
  ];

  return (
    <div>
      {/* Hero card */}
      <section className="relative mb-6 overflow-hidden rounded-3xl bg-gradient-to-br from-orange-500 via-orange-600 to-amber-600 p-6 text-white shadow-xl shadow-orange-500/25 sm:p-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/15 blur-2xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-amber-300/20 blur-2xl"
        />
        <p className="relative text-sm font-bold uppercase tracking-widest text-white/80">
          Invite &amp; earn
        </p>
        <h2 className="relative mt-1 text-2xl font-extrabold sm:text-3xl">
          Share ZUVO, grow together
        </h2>
        <p className="relative mt-1 max-w-md text-sm text-white/85">
          Send your code to friends. When they join with it, you both get closer to rewards.
        </p>

        {/* Ticket-style code */}
        <div className="relative mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center justify-between gap-3 rounded-2xl border-2 border-dashed border-white/50 bg-white/10 px-5 py-3 backdrop-blur-sm">
            <span className="text-xs font-bold uppercase tracking-widest text-white/70">Your code</span>
            <span className="font-mono text-2xl font-extrabold tracking-wider text-white">
              {dashboard.code}
            </span>
          </div>
          <button
            type="button"
            onClick={() => copy(dashboard.code, "code")}
            className="rounded-2xl bg-white px-6 py-3 text-sm font-extrabold text-orange-700 shadow-lg transition hover:bg-orange-50 active:scale-95"
          >
            {copied === "code" ? "✓ Copied!" : "Copy code"}
          </button>
        </div>
      </section>

      {/* Invite link */}
      <section className={`${cardCls} mb-6 p-5 sm:p-6`}>
        <h3 className="mb-1 text-base font-bold text-zinc-900">Your invite link</h3>
        <p className="mb-3 text-sm text-zinc-500">
          Anyone who signs up through this link is counted as your referral.
        </p>
        <div className="flex flex-col gap-2 rounded-2xl bg-zinc-50 p-2 sm:flex-row sm:items-center">
          <code className="min-w-0 flex-1 truncate px-3 py-2 text-sm text-zinc-700" title={shareUrl}>
            {shareUrl}
          </code>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => copy(shareUrl, "link")}
              className="flex-1 rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-bold text-zinc-700 transition hover:bg-zinc-100 active:scale-95 sm:flex-none"
            >
              {copied === "link" ? "✓ Copied!" : "Copy link"}
            </button>
            <button
              type="button"
              onClick={share}
              className="flex-1 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-2 text-sm font-extrabold text-white shadow-md shadow-orange-500/30 transition hover:brightness-105 active:scale-95 sm:flex-none"
            >
              Share
            </button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="relative overflow-hidden rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm"
          >
            <span
              className={`inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${s.gradient} text-lg shadow-md`}
            >
              {s.icon}
            </span>
            <p className="mt-2 text-2xl font-extrabold text-zinc-900">{s.value}</p>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{s.label}</p>
          </div>
        ))}
      </div>

      <section className={`${cardCls} mb-6 p-5 sm:p-6`}>
        <h2 className="mb-4 text-lg font-bold text-zinc-900">Your referrals</h2>
        {dashboard.attributions.length === 0 ? (
          <div className="rounded-2xl bg-zinc-50 px-4 py-8 text-center">
            <p className="text-3xl">💌</p>
            <p className="mt-2 text-sm font-semibold text-zinc-700">No referrals yet</p>
            <p className="mt-1 text-sm text-zinc-500">
              Share your link above to get started.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-zinc-500">
                  <th className="pb-2 pr-4 font-medium">Friend</th>
                  <th className="pb-2 pr-4 font-medium">Date</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {dashboard.attributions.map((a) => (
                  <tr key={a.id}>
                    <td className="py-2 pr-4 font-medium text-zinc-900">{a.referredName}</td>
                    <td className="py-2 pr-4 text-zinc-600">
                      {new Date(a.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td className="py-2">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${
                          a.status === "ELIGIBLE"
                            ? "bg-green-100 text-green-800"
                            : a.status === "REJECTED"
                              ? "bg-red-100 text-red-700"
                              : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        <span
                          aria-hidden="true"
                          className={`h-1.5 w-1.5 rounded-full ${
                            a.status === "ELIGIBLE"
                              ? "bg-green-500"
                              : a.status === "REJECTED"
                                ? "bg-red-500"
                                : "bg-amber-500"
                          }`}
                        />
                        {a.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className={`${cardCls} p-5 sm:p-6`}>
        <h2 className="mb-3 text-lg font-bold text-zinc-900">How it works</h2>
        <ol className="space-y-3">
          {[
            { n: "1", t: "Share your code or link with friends — visits are counted automatically." },
            { n: "2", t: "When a friend signs up with your code, they are attributed to you exactly once." },
            { n: "3", t: "New referrals start as Pending and become Eligible after review." },
            { n: "4", t: "Referral rewards are demo credit with no cash value." },
          ].map((s) => (
            <li key={s.n} className="flex items-start gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-amber-500 text-xs font-extrabold text-white shadow-md shadow-orange-500/30">
                {s.n}
              </span>
              <p className="pt-1 text-sm text-zinc-600">{s.t}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
