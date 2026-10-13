"use client";

import { useEffect, useState } from "react";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** "Notify me when available" box shown for out-of-stock products. */
export default function StockAlertBox({
  productId,
  initialEmail,
}: {
  productId: string;
  initialEmail: string;
}) {
  const [email, setEmail] = useState(initialEmail);
  const [status, setStatus] = useState<"checking" | "idle" | "subscribed" | "done" | "error">("checking");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!initialEmail || !EMAIL_RE.test(initialEmail)) {
      setStatus("idle");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/stock-alerts?productId=${encodeURIComponent(productId)}&email=${encodeURIComponent(initialEmail)}`
        );
        const d = await res.json();
        if (!cancelled) setStatus(d.subscribed ? "subscribed" : "idle");
      } catch {
        if (!cancelled) setStatus("idle");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [productId, initialEmail]);

  async function subscribe() {
    const clean = email.trim();
    if (!EMAIL_RE.test(clean)) {
      setMsg("Please enter a valid email address.");
      return;
    }
    setStatus("checking");
    setMsg("");
    try {
      const res = await fetch("/api/stock-alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, email: clean }),
      });
      const d = await res.json();
      if (d.ok) {
        setStatus("done");
      } else {
        setStatus("error");
        setMsg(d.error ?? "Something went wrong.");
      }
    } catch {
      setStatus("error");
      setMsg("Something went wrong. Try again.");
    }
  }

  if (status === "done" || status === "subscribed") {
    return (
      <div className="mt-4 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-800">
        🔔 You&apos;re on the list! We&apos;ll email you as soon as it&apos;s back in stock.
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-4">
      <p className="text-sm font-extrabold text-zinc-900">🔔 Notify me when available</p>
      <p className="mt-1 text-xs text-zinc-600">
        We&apos;ll send you an email the moment this product is back in stock.
      </p>
      <div className="mt-3 flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") subscribe();
          }}
          placeholder="Your email address"
          aria-label="Email for stock alert"
          className="min-w-0 flex-1 rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={subscribe}
          disabled={status === "checking"}
          className="shrink-0 rounded-xl bg-orange-500 px-4 py-2 text-sm font-bold text-white hover:bg-orange-600 disabled:opacity-50"
        >
          {status === "checking" ? "…" : "Notify me"}
        </button>
      </div>
      {msg && <p className="mt-2 text-xs font-semibold text-red-600">{msg}</p>}
    </div>
  );
}
