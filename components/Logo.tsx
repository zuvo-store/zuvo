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
      className={`flex min-w-0 shrink items-center gap-2 ${className}`}
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
        {/* organic blob — no corners, matches the mascot character */}
        <path
          d="M18 2c7.5 0 11.5 3.2 13.4 7.1 1.9 3.8 1.6 8.6-.6 12.3-2.2 3.8-6.4 6.1-11 6.3-5.2.3-10.3-1.6-12.9-5.6C4.4 18.2 4 13.5 5.8 9.7 7.7 5.7 11.7 2 18 2z"
          fill="url(#zuvo-logo-grad)"
        />
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
        <span className="flex min-w-0 flex-col leading-none">
          <span className="text-xl font-extrabold tracking-tight text-zinc-900">
            ZUVO
          </span>
          {tagline ? (
            <span className="mt-0.5 hidden truncate text-[10px] font-medium tracking-wide text-zinc-500 sm:block">
              {tagline}
            </span>
          ) : null}
        </span>
      )}
    </Link>
  );
}
