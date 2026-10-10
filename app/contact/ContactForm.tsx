"use client";

import { useState } from "react";
import { btn, inputCls, Field, FormError, cardCls } from "@/components/ui";

export default function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Could not send your message.");
      } else {
        setSent(true);
      }
    } catch {
      setError("Could not send your message. Please try again.");
    } finally {
      setPending(false);
    }
  }

  if (sent) {
    return (
      <div className={`${cardCls} p-6 text-center`}>
        <h2 className="text-lg font-bold text-zinc-900">Message received</h2>
        <p className="mt-2 text-sm text-zinc-600">
          Thanks, {name.split(" ")[0] || "there"}. Your message has been logged for the demo
          team. As this is a demonstration site, replies are not guaranteed.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className={`${cardCls} flex flex-col gap-4 p-5`}>
      <Field label="Your name">
        <input
          className={inputCls}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={80}
          placeholder="Jane Doe"
        />
      </Field>
      <Field label="Email address">
        <input
          className={inputCls}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          maxLength={160}
          placeholder="you@example.com"
        />
      </Field>
      <Field label="Message">
        <textarea
          className={inputCls}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={5}
          required
          maxLength={3000}
          placeholder="How can we help?"
        />
        <p className="mt-1.5 text-xs text-zinc-500">
          At least 10 characters. Please do not include sensitive personal data.
        </p>
      </Field>
      {error && <FormError message={error} />}
      <div>
        <button type="submit" className={btn} disabled={pending}>
          {pending ? "Sending…" : "Send message"}
        </button>
      </div>
    </form>
  );
}
