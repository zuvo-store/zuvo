"use client";

import { useState } from "react";
import Link from "next/link";
import { btnPrimary } from "@/components/ui";

export default function TermsAck() {
  const [ack, setAck] = useState(false);

  return (
    <div className="mt-8 rounded-xl bg-zinc-50 p-4">
      <label className="flex items-start gap-2 text-sm text-zinc-700">
        <input
          type="checkbox"
          checked={ack}
          onChange={(e) => setAck(e.target.checked)}
          className="mt-1 h-4 w-4 accent-brand-600"
        />
        <span>
          I understand that ZUVO rewards are a simulated demonstration with no cash value, and that
          nothing is paid out or charged.
        </span>
      </label>
      {ack ? (
        <Link href="/rewards" className={`${btnPrimary} mt-4 inline-flex`}>
          I understand — take me to rewards
        </Link>
      ) : (
        <span
          aria-disabled="true"
          className={`${btnPrimary} mt-4 inline-flex cursor-not-allowed opacity-40`}
        >
          I understand — take me to rewards
        </span>
      )}
    </div>
  );
}
