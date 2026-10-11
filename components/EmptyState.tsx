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
      <img
        src="/zuvo-mascot.jpg"
        alt="ZUVO mascot"
        loading="lazy"
        className="animate-float-soft h-28 w-28 rounded-3xl object-cover shadow-xl shadow-orange-500/20"
      />
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
