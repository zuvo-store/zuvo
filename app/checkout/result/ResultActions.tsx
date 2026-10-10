"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { btn } from "@/components/ui";

export function PendingConfirmButton({ orderNumber }: { orderNumber: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/payments/confirm-pending", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Could not confirm the pending payment.");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      {error && (
        <p role="alert" className="mb-3 text-sm text-red-700">
          {error}
        </p>
      )}
      <button type="button" onClick={confirm} disabled={pending} className={btn}>
        {pending ? "Confirming…" : "Simulate provider confirmation"}
      </button>
      <p className="mt-2 text-xs text-zinc-500">
        Demo only — this mimics the payment provider confirming your payment.
      </p>
    </div>
  );
}
