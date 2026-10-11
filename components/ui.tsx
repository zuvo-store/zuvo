import Link from "next/link";
import type { ReactNode } from "react";

// ------------------------------------------------------------------ class strings
export const btnPrimary =
  "btn-3d inline-flex items-center justify-center rounded-full bg-gradient-to-b from-orange-500 to-orange-600 px-6 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50";

export const btnSecondary =
  "inline-flex items-center justify-center rounded-full border border-zinc-200 bg-white px-6 py-2.5 text-sm font-semibold text-zinc-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50";

export const btnGhost =
  "inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50";

/** Base button class (alias of primary) for quick use. */
export const btn = btnPrimary;

export const inputCls =
  "block w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 shadow-sm focus:border-brand-600 focus:outline-none";

export const labelCls = "mb-1.5 block text-sm font-medium text-zinc-700";

export const cardCls =
  "card-3d rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm sm:p-6";

// For cards with full-bleed content (images, banners) — no outer padding.
export const cardFlushCls = "card-3d rounded-2xl border border-zinc-100 bg-white shadow-sm";

// ------------------------------------------------------------------ Field
export function Field({
  label,
  error,
  htmlFor,
  children,
  hint,
  className = "",
}: {
  label: string;
  error?: string | null;
  htmlFor?: string;
  children: ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className={labelCls}>
        {label}
      </label>
      {children}
      {hint ? <p className="mt-1 text-xs text-zinc-500">{hint}</p> : null}
      {error ? <p className="mt-1.5 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

// ------------------------------------------------------------------ FormError
export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
    >
      {message}
    </div>
  );
}

// ------------------------------------------------------------------ Badge
const badgeTones: Record<string, string> = {
  brand: "bg-brand-100 text-brand-800",
  green: "bg-green-100 text-green-800",
  red: "bg-red-100 text-red-700",
  amber: "bg-amber-100 text-amber-800",
  zinc: "bg-zinc-100 text-zinc-700",
  blue: "bg-blue-100 text-blue-800",
};

export function Badge({
  tone = "zinc",
  children,
  className = "",
}: {
  tone?: keyof typeof badgeTones | string;
  children: ReactNode;
  className?: string;
}) {
  const toneCls = badgeTones[tone] ?? badgeTones.zinc;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${toneCls} ${className}`}
    >
      {children}
    </span>
  );
}

// ------------------------------------------------------------------ SectionTitle
export function SectionTitle({
  title,
  subtitle,
  href,
  linkLabel,
  actionHref,
  actionLabel,
  className = "",
}: {
  title: string;
  subtitle?: string;
  href?: string;
  linkLabel?: string;
  /** Aliases kept for callers that use actionHref/actionLabel. */
  actionHref?: string;
  actionLabel?: string;
  className?: string;
}) {
  const linkHref = href ?? actionHref;
  const label = linkLabel ?? actionLabel;
  return (
    <div className={`mb-5 flex items-end justify-between gap-4 ${className}`}>
      <div>
        <h2 className="text-xl font-bold tracking-tight text-zinc-900 sm:text-2xl">
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>
        ) : null}
      </div>
      {linkHref && label ? (
        <Link
          href={linkHref}
          className="shrink-0 text-sm font-semibold text-brand-700 hover:text-brand-800 hover:underline"
        >
          {label}
        </Link>
      ) : null}
    </div>
  );
}
