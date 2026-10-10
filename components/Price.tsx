import { formatUSD } from "@/lib/money";

export default function Price({
  cents,
  originalCents,
  className = "",
}: {
  cents: number;
  originalCents?: number | null;
  className?: string;
}) {
  const hasOriginal = originalCents != null && originalCents > cents;
  return (
    <span className={`inline-flex flex-wrap items-baseline gap-x-2 ${className}`}>
      <span className="text-lg font-bold text-zinc-900">{formatUSD(cents)}</span>
      {hasOriginal ? (
        <span className="text-sm text-zinc-400 line-through">
          {formatUSD(originalCents!)}
        </span>
      ) : null}
    </span>
  );
}
