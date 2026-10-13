"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Suggestion = {
  slug: string;
  name: string;
  priceCents?: number;
  image?: string;
};

export default function SearchBox({ className = "", placeholder = "Search products…" }: { className?: string; placeholder?: string }) {
  const router = useRouter();
  const listId = useId();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const boxRef = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced suggestions (300ms)
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    const query = q.trim();
    if (query.length < 2) {
      setSuggestions([]);
      setOpen(false);
      setActive(-1);
      return;
    }
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search/suggest?q=${encodeURIComponent(query)}`);
        if (!res.ok) throw new Error("bad");
        const data = await res.json();
        const list: Suggestion[] = Array.isArray(data.suggestions) ? data.suggestions.slice(0, 8) : [];
        setSuggestions(list);
        setOpen(true);
        setActive(-1);
      } catch {
        setSuggestions([]);
        setOpen(false);
      }
    }, 300);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [q]);

  // Close on outside click
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    const query = q.trim();
    if (!query) return;
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(query)}`);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      setOpen(false);
      setActive(-1);
      return;
    }
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (a + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (a - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter" && active >= 0) {
      e.preventDefault();
      const s = suggestions[active];
      setOpen(false);
      router.push(`/product/${s.slug}`);
    }
  }

  return (
    <div ref={boxRef} className={`relative ${className}`}>
      <form onSubmit={submit} role="search">
        <label htmlFor={listId} className="sr-only">
          Search products
        </label>
        <div className="flex w-full items-center overflow-hidden rounded-full border border-zinc-300 bg-zinc-50 transition focus-within:border-orange-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-orange-100">
          <svg
            width="18"
            height="18"
            viewBox="0 0 20 20"
            fill="none"
            aria-hidden="true"
            className="ml-4 shrink-0 text-zinc-400"
          >
            <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="2" />
            <path d="M13.5 13.5L17 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input
            id={listId}
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKeyDown}
            onFocus={() => suggestions.length > 0 && setOpen(true)}
            placeholder={placeholder}
            autoComplete="off"
            role="combobox"
            aria-expanded={open}
            aria-controls={`${listId}-list`}
            aria-activedescendant={active >= 0 ? `${listId}-opt-${active}` : undefined}
            className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none"
          />
          <button
            type="submit"
            aria-label="Search"
            className="m-1 flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-zinc-900 px-4 text-sm font-bold text-white transition hover:bg-zinc-700 active:scale-95"
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="2" />
              <path d="M13.5 13.5L17 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span className="hidden lg:inline">Search</span>
          </button>
        </div>
      </form>
      {open && suggestions.length > 0 ? (
        <ul
          id={`${listId}-list`}
          role="listbox"
          aria-label="Search suggestions"
          className="absolute inset-x-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg"
        >
          {suggestions.map((s, i) => (
            <li key={s.slug} id={`${listId}-opt-${i}`} role="option" aria-selected={i === active}>
              <Link
                href={`/product/${s.slug}`}
                onClick={() => setOpen(false)}
                onMouseEnter={() => setActive(i)}
                className={`flex items-center gap-3 px-4 py-2.5 text-sm ${
                  i === active ? "bg-brand-50 text-brand-900" : "text-zinc-700"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {s.image ? (
                  <img src={s.image} alt="" className="h-8 w-8 rounded-lg bg-zinc-100 object-cover" />
                ) : null}
                <span className="min-w-0 flex-1 truncate">{s.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
