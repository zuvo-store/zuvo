import { getActiveCampaigns } from "@/lib/campaigns";

/** Storefront banner for live discount campaigns. */
export default async function CampaignBanner() {
  const live = await getActiveCampaigns();
  if (live.length === 0) return null;
  const c = live[0]; // show the best (highest discount)
  const label =
    c.bannerText ??
    `${c.name} — ${c.discountType === "PERCENT" ? `${c.discountValue}% OFF` : `$${(c.discountValue / 100).toFixed(2)} off`}!`;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-red-600 via-orange-500 to-amber-500 px-4 py-3 text-center shadow-lg">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 12px, rgba(255,255,255,.35) 12px, rgba(255,255,255,.35) 24px)",
        }}
      />
      <p className="relative text-sm font-extrabold tracking-wide text-white sm:text-base">
        🎉 {label} 🎉
      </p>
      <p className="relative mt-0.5 text-[11px] font-medium text-white/90">
        Auto-applied at checkout — no code needed!
      </p>
    </div>
  );
}
