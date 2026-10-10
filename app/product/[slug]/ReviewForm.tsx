"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { btn, inputCls, FormError } from "@/components/ui";


export default function ReviewForm({ slug }: { slug: string }) {
  const router = useRouter();
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/products/${slug}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, title, body }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Could not submit your review.");
      } else {
        setDone(true);
        setTitle("");
        setBody("");
        setRating(5);
        router.refresh();
      }
    } catch {
      setError("Could not submit your review. Please try again.");
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-xl bg-green-50 p-4 text-sm text-green-800 ring-1 ring-green-200">
        Thanks — your review was submitted and is now visible below.
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div>
        <p className="mb-1 text-sm font-medium text-zinc-700">Your rating</p>
        <div className="flex items-center gap-1" role="radiogroup" aria-label="Rating">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              aria-label={`${n} star${n === 1 ? "" : "s"}`}
              className={`p-0.5 text-2xl leading-none transition ${
                n <= (hover || rating) ? "text-orange-500" : "text-zinc-300"
              }`}
            >
              ★
            </button>
          ))}
          <span className="ml-2 text-sm text-zinc-500">{rating} / 5</span>
        </div>
      </div>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-zinc-700">Headline (optional)</span>
        <input
          className={inputCls}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
          placeholder="Sum it up in a line"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-zinc-700">Review</span>
        <textarea
          className={inputCls}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          maxLength={2000}
          required
          placeholder="What did you like? What could be better?"
        />
      </label>
      {error && <FormError message={error} />}
      <div>
        <button type="submit" className={btn} disabled={pending}>
          {pending ? "Submitting…" : "Submit review"}
        </button>
      </div>
      <p className="text-xs text-zinc-500">
        Demo store: reviews are stored locally and shown immediately.
      </p>
    </form>
  );
}
