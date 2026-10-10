import Link from "next/link";

const STEPS = [
  { label: "Contact & shipping", href: "/checkout" },
  { label: "Review", href: "/checkout/review" },
  { label: "Payment", href: "/checkout/payment" },
  { label: "Done", href: null },
] as const;

export default function CheckoutSteps({ current }: { current: 1 | 2 | 3 | 4 }) {
  return (
    <nav aria-label="Checkout progress" className="mb-8">
      <ol className="flex items-center">
        {STEPS.map((step, i) => {
          const n = (i + 1) as 1 | 2 | 3 | 4;
          const done = n < current;
          const isCurrent = n === current;
          const last = i === STEPS.length - 1;
          const circle = (
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                done
                  ? "bg-brand-600 text-white"
                  : isCurrent
                    ? "border-2 border-brand-600 bg-white text-brand-700"
                    : "border-2 border-zinc-200 bg-white text-zinc-400"
              }`}
              aria-current={isCurrent ? "step" : undefined}
            >
              {done ? (
                <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path
                    d="M4 10.5l4 4 8-9"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                n
              )}
            </span>
          );
          return (
            <li key={step.label} className={`flex items-center ${last ? "" : "flex-1"}`}>
              <div className="flex items-center gap-2">
                {done && step.href ? (
                  <Link href={step.href} aria-label={`${step.label} (completed)`}>
                    {circle}
                  </Link>
                ) : (
                  circle
                )}
                {done && step.href ? (
                  <Link
                    href={step.href}
                    className="hidden text-sm font-medium text-zinc-700 hover:text-brand-700 sm:block"
                  >
                    {step.label}
                  </Link>
                ) : (
                  <span
                    className={`hidden text-sm sm:block ${
                      isCurrent ? "font-semibold text-zinc-900" : "font-medium text-zinc-400"
                    }`}
                  >
                    {step.label}
                  </span>
                )}
              </div>
              {last ? null : (
                <div
                  className={`mx-2 h-0.5 flex-1 sm:mx-4 ${done ? "bg-brand-600" : "bg-zinc-200"}`}
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
