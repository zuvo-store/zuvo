import Link from "next/link";
import { btnPrimary } from "@/components/ui";

export default function EmptyState({
  title,
  message,
  actionHref,
  actionLabel,
}: {
  title: string;
  message: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-16 text-center">
      <svg
        width="96"
        height="96"
        viewBox="0 0 96 96"
        role="img"
        aria-label="Empty illustration"
        className="text-zinc-200"
      >
        <rect x="12" y="28" width="72" height="48" rx="8" fill="currentColor" />
        <path
          d="M12 40 L48 60 L84 40"
          stroke="#ffffff"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <rect x="38" y="18" width="20" height="14" rx="3" fill="#fdba74" />
      </svg>
      <h2 className="mt-5 text-lg font-bold text-zinc-900">{title}</h2>
      <p className="mt-2 text-sm text-zinc-500">{message}</p>
      {actionHref && actionLabel ? (
        <Link href={actionHref} className={`${btnPrimary} mt-6`}>
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
