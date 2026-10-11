"use client";

const ITEMS = [
  "⚡ Flash Sale — up to 50% off",
  "🎁 New users get $20 reward",
  "🚚 Free shipping on orders $50+",
  "✨ New arrivals every week",
  "💰 Extra 10% off with SUMMER2K26",
  "🔥 Trending now — shop bestsellers",
];

/** Scrolling deals ticker — pure CSS marquee, pauses on hover. */
export default function DealsTicker() {
  const row = [...ITEMS, ...ITEMS];
  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-orange-600 via-orange-500 to-orange-600 py-2.5 text-white shadow-md">
      <div className="animate-marquee flex w-max items-center gap-8 whitespace-nowrap">
        {row.map((item, i) => (
          <span key={i} className="flex items-center gap-8 text-sm font-semibold">
            <span>{item}</span>
            <span aria-hidden="true" className="text-white/50">•</span>
          </span>
        ))}
      </div>
      {/* edge fade */}
      <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-orange-600 to-transparent" />
      <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-orange-600 to-transparent" />
    </div>
  );
}
