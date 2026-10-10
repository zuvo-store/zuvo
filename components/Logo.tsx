import Link from "next/link";

export default function Logo({
  compact = false,
  tagline,
  className = "",
}: {
  compact?: boolean;
  tagline?: string;
  className?: string;
}) {
  return (
    <Link
      href="/"
      aria-label="ZUVO home"
      className={`flex shrink-0 items-center gap-2 ${className}`}
    >
      <svg
        width="36"
        height="36"
        viewBox="0 0 36 36"
        role="img"
        aria-label="ZUVO logo"
        className="h-9 w-9"
      >
        <defs>
          <linearGradient id="zuvo-logo-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fb923c" />
            <stop offset="100%" stopColor="#ea580c" />
          </linearGradient>
        </defs>
        <rect x="1" y="1" width="34" height="34" rx="9" fill="url(#zuvo-logo-grad)" />
        <text
          x="18"
          y="25"
          textAnchor="middle"
          fontFamily="ui-sans-serif, system-ui, sans-serif"
          fontWeight="800"
          fontSize="20"
          fill="#ffffff"
        >
          Z
        </text>
      </svg>
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="text-xl font-extrabold tracking-tight text-zinc-900">
            ZUVO
          </span>
          {tagline ? (
            <span className="mt-0.5 text-[10px] font-medium tracking-wide text-zinc-500">
              {tagline}
            </span>
          ) : null}
        </span>
      )}
    </Link>
  );
}
