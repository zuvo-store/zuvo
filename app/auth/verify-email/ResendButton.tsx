"use client";

import { useState } from "react";
import Link from "next/link";
import { btnPrimary } from "@/components/ui";

export default function ResendButton() {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [demoLink, setDemoLink] = useState<string | null>(null);

  async function resend() {
    setPending(true);
    setMessage(null);
    setDemoLink(null);
    try {
      const res = await fetch("/api/auth/resend-verification", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setMessage(data.error || "Could not send a new link. Please try again.");
        return;
      }
      if (data.already) {
        setMessage("Your email is already verified — you are all set.");
      } else {
        setMessage("A new verification link has been sent.");
      }
      if (data.demoVerifyLink) setDemoLink(data.demoVerifyLink as string);
    } catch {
      setMessage("Network error. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-6">
      <button type="button" onClick={resend} disabled={pending} className={btnPrimary}>
        {pending ? "Sending…" : "Send me a new link"}
      </button>
      {message && <p className="mt-2 text-sm text-zinc-600">{message}</p>}
      {demoLink && (
        <div className="mt-3 rounded-xl border border-dashed border-amber-400 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-800">Demo mode: email sending not configured</p>
          <Link href={demoLink} className="mt-1 block break-all text-sm font-medium text-brand-700 underline">
            {demoLink}
          </Link>
        </div>
      )}
    </div>
  );
}
