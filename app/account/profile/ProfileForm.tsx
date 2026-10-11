"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { inputCls, btn, cardCls } from "@/components/ui";

type Props = {
  initialName: string;
  email: string;
  emailVerified: boolean;
};

const fieldLabel = "mb-1 block text-sm font-medium text-zinc-700";

export default function ProfileForm({ initialName, email, emailVerified }: Props) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setPending(true);
    try {
      const res = await fetch("/api/account/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setMessage({ ok: false, text: data.error ?? "Could not save your profile." });
      } else {
        setMessage({ ok: true, text: "Profile updated." });
        router.refresh();
      }
    } catch {
      setMessage({ ok: false, text: "Network error. Please try again." });
    } finally {
      setPending(false);
    }
  }

  async function resendVerification() {
    setResendMsg(null);
    setResending(true);
    try {
      const res = await fetch("/api/auth/resend-verification", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; message?: string };
      if (res.status === 404) {
        setResendMsg("Verification email service is not available right now.");
      } else if (!res.ok || !data.ok) {
        setResendMsg(data.error ?? "Could not resend the verification email.");
      } else {
        setResendMsg(data.message ?? "Verification email sent. Check your inbox.");
      }
    } catch {
      setResendMsg("Network error. Please try again.");
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={save} className={cardCls}>
        <h2 className="mb-4 text-lg font-semibold text-zinc-900">Profile</h2>
        {message && (
          <p
            role="alert"
            className={`mb-4 rounded-xl px-4 py-3 text-sm ${
              message.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
            }`}
          >
            {message.text}
          </p>
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="profile-name" className={fieldLabel}>
              Full name
            </label>
            <input
              id="profile-name"
              className={inputCls}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              required
              disabled={pending}
            />
          </div>
          <div>
            <label htmlFor="profile-email" className={fieldLabel}>
              Email
            </label>
            <div className="flex items-center gap-2">
              <input id="profile-email" className={inputCls} value={email} readOnly disabled aria-readonly />
              {emailVerified ? (
                <span className="shrink-0 rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">
                  Verified
                </span>
              ) : (
                <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                  Unverified
                </span>
              )}
            </div>
          </div>
        </div>
        <button type="submit" className={`${btn} mt-4`} disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </button>
      </form>

      {!emailVerified && (
        <div className={cardCls}>
          <h2 className="mb-2 text-lg font-semibold text-zinc-900">Verify your email</h2>
          <p className="mb-3 text-sm text-zinc-600">
            We sent a verification link to {email}. Verify your email to secure your account.
          </p>
          {resendMsg && <p className="mb-3 text-sm text-zinc-700">{resendMsg}</p>}
          <button
            type="button"
            onClick={resendVerification}
            disabled={resending}
            className="rounded-xl border border-zinc-300 px-4 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
          >
            {resending ? "Sending…" : "Resend verification email"}
          </button>
        </div>
      )}
    </div>
  );
}
