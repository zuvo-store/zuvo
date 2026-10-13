"use client";

import { useState } from "react";
import { inputCls, btn } from "@/components/ui";

const fieldLabel = "mb-1 block text-sm font-medium text-zinc-700";

export function PasswordForm({ isGoogleUser = false }: { isGoogleUser?: boolean }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setPending(true);
    try {
      const body: Record<string, string> = { newPassword, confirmPassword };
      if (!isGoogleUser) body.currentPassword = currentPassword;
      const res = await fetch("/api/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setMessage({ ok: false, text: data.error ?? "Could not change your password." });
      } else {
        setMessage({ ok: true, text: isGoogleUser ? "Password set. You can now log in with your email too." : "Password changed." });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch {
      setMessage({ ok: false, text: "Network error. Please try again." });
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={save} className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 className="mb-2 text-lg font-semibold text-zinc-900">
        {isGoogleUser ? "Set a password" : "Change password"}
      </h2>
      {isGoogleUser && (
        <p className="mb-4 text-sm text-zinc-600">
          You signed in with Google. Set a password to also log in with your email.
        </p>
      )}
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
      <div className="grid max-w-md grid-cols-1 gap-4">
        {!isGoogleUser && (
          <div>
            <label htmlFor="pw-current" className={fieldLabel}>Current password</label>
            <input id="pw-current" type="password" className={inputCls} value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)} autoComplete="current-password"
              required disabled={pending} />
          </div>
        )}
        <div>
          <label htmlFor="pw-new" className={fieldLabel}>New password</label>
          <input id="pw-new" type="password" className={inputCls} value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password"
            required disabled={pending} />
          <p className="mt-1 text-xs text-zinc-500">At least 8 characters, with a letter and a number.</p>
        </div>
        <div>
          <label htmlFor="pw-confirm" className={fieldLabel}>Confirm new password</label>
          <input id="pw-confirm" type="password" className={inputCls} value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password"
            required disabled={pending} />
        </div>
      </div>
      <button type="submit" className={`${btn} mt-4`} disabled={pending}>
        {pending ? "Saving…" : isGoogleUser ? "Set password" : "Change password"}
      </button>
    </form>
  );
}

export function DeleteAccountForm({ email, isGoogleUser = false }: { email: string; isGoogleUser?: boolean }) {
  const [typedEmail, setTypedEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function destroy(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const body: Record<string, string> = { email: typedEmail };
      if (!isGoogleUser) body.password = password;
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Could not delete your account.");
        return;
      }
      window.location.href = "/";
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-xl border border-red-200 bg-white p-6 shadow-sm">
      <h2 className="mb-2 text-lg font-semibold text-red-700">Danger zone</h2>
      <p className="mb-4 text-sm text-zinc-600">
        Deleting your account permanently removes your profile, saved addresses, wishlist and
        rewards. Past orders are kept for records but detached from your account. This cannot be
        undone.
      </p>
      {!confirmOpen ? (
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
        >
          Delete my account
        </button>
      ) : (
        <form onSubmit={destroy} className="max-w-md">
          {error && (
            <p role="alert" className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          )}
          <p className="mb-3 text-sm font-medium text-zinc-700">
            {isGoogleUser ? (
              <>Type your email (<span className="font-mono">{email}</span>) to confirm deletion (no password needed — you signed in with Google).</>
            ) : (
              <>Type your email (<span className="font-mono">{email}</span>) and enter your password to confirm deletion.</>
            )}
          </p>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label htmlFor="del-email" className={fieldLabel}>Email</label>
              <input id="del-email" type="email" className={inputCls} value={typedEmail}
                onChange={(e) => setTypedEmail(e.target.value)} autoComplete="email"
                required disabled={pending} />
            </div>
            {!isGoogleUser && (
              <div>
                <label htmlFor="del-password" className={fieldLabel}>Password</label>
                <input id="del-password" type="password" className={inputCls} value={password}
                  onChange={(e) => setPassword(e.target.value)} autoComplete="current-password"
                  required disabled={pending} />
              </div>
            )}
          </div>
          <div className="mt-4 flex gap-3">
            <button
              type="submit"
              disabled={pending}
              className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
            >
              {pending ? "Deleting…" : "Yes, delete my account"}
            </button>
            <button
              type="button"
              onClick={() => setConfirmOpen(false)}
              disabled={pending}
              className="rounded-xl border border-zinc-300 px-4 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
