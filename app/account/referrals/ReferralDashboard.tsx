"use client";

import { useState } from "react";
import type { ReferralDashboard } from "@/lib/referrals";
import { cardCls, btn } from "@/components/ui";

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
    { label: "Link visits", value: dashboard.visits },
    { label: "Signups", value: dashboard.signups },
    { label: "Pending", value: dashboard.pending },
    { label: "Eligible", value: dashboard.eligible },
  ];

  return (
    <div>
      <section className={`${cardCls} mb-6`}>
        <h2 className="mb-2 text-lg font-semibold text-zinc-900">Your referral code</h2>
        <div className="flex flex-wrap items-center gap-3">
          <p className="rounded-xl bg-zinc-100 px-6 py-3 font-mono text-2xl font-bold tracking-[0.3em] text-zinc-900">
            {dashboard.code}
          </p>
          <button type="button" onClick={() => copy(dashboard.code, "code")} className={btn}>
            {copied === "code" ? "Copied!" : "Copy code"}
          </button>
        </div>
        <div className="mt-4">
          <p className="mb-1 text-sm font-medium text-zinc-700">Your invite link</p>
          <div className="flex flex-wrap items-center gap-2">
            <code className="min-w-0 flex-1 break-all rounded-xl bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
              {shareUrl}
            </code>
            <button
              type="button"
              onClick={() => copy(shareUrl, "link")}
              className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
            >
              {copied === "link" ? "Copied!" : "Copy link"}
            </button>
            <button type="button" onClick={share} className={btn}>
              Share
            </button>
          </div>
        </div>
      </section>

      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className={cardCls}>
            <p className="text-sm text-zinc-500">{s.label}</p>
            <p className="mt-1 text-2xl font-bold text-zinc-900">{s.value}</p>
          </div>
        ))}
      </div>

      <section className={`${cardCls} mb-6`}>
        <h2 className="mb-4 text-lg font-semibold text-zinc-900">Your referrals</h2>
        {dashboard.attributions.length === 0 ? (
          <p className="text-sm text-zinc-500">
            No one has signed up with your code yet. Share your link to get started.
          </p>
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
                      {new Date(a.createdAt).toLocaleString("en-US")}
                    </td>
                    <td className="py-2">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          a.status === "ELIGIBLE"
                            ? "bg-green-100 text-green-800"
                            : a.status === "REJECTED"
                              ? "bg-red-100 text-red-700"
                              : "bg-amber-100 text-amber-800"
                        }`}
                      >
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

      <section className={cardCls}>
        <h2 className="mb-2 text-lg font-semibold text-zinc-900">How it works</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-600">
          <li>Share your code or link with friends. Visits to your link are counted automatically.</li>
          <li>When a friend signs up with your code, they are attributed to you exactly once.</li>
          <li>You cannot refer yourself — self-referrals are rejected.</li>
          <li>New referrals start as Pending and become Eligible after review.</li>
          <li>Referral rewards are demo credit with no cash value.</li>
        </ul>
      </section>
    </div>
  );
}
