import { db } from "./db";

export type ActiveCampaign = {
  id: string;
  name: string;
  bannerText: string | null;
  discountType: string;
  discountValue: number;
  appliesTo: string;
  categoryId: string | null;
  minOrderCents: number;
};

/** Campaigns currently live (active + within window). */
export async function getActiveCampaigns(): Promise<ActiveCampaign[]> {
  const now = new Date();
  const list = await db.campaign.findMany({
    where: { active: true, startsAt: { lte: now }, endsAt: { gte: now } },
    select: {
      id: true, name: true, bannerText: true, discountType: true,
      discountValue: true, appliesTo: true, categoryId: true, minOrderCents: true,
    },
    orderBy: { discountValue: "desc" },
  });
  return list;
}

/**
 * Pick the best campaign for a cart and compute its discount.
 * items: [{ priceCents, qty, categoryId }]
 * Returns { campaign, discountCents } or null.
 */
export function bestCampaignFor(
  campaigns: ActiveCampaign[],
  items: { priceCents: number; qty: number; categoryId: string }[],
  subtotalCents: number
): { campaign: ActiveCampaign; discountCents: number } | null {
  let best: { campaign: ActiveCampaign; discountCents: number } | null = null;
  for (const c of campaigns) {
    if (subtotalCents < c.minOrderCents) continue;
    // Eligible subtotal (category-scoped or whole cart)
    let eligible = subtotalCents;
    if (c.appliesTo === "CATEGORY" && c.categoryId) {
      eligible = items
        .filter((i) => i.categoryId === c.categoryId)
        .reduce((s, i) => s + i.priceCents * i.qty, 0);
      if (eligible <= 0) continue;
    }
    const discount =
      c.discountType === "PERCENT"
        ? Math.round((eligible * Math.min(c.discountValue, 90)) / 100)
        : Math.min(c.discountValue, eligible);
    if (discount > 0 && (!best || discount > best.discountCents)) {
      best = { campaign: c, discountCents: discount };
    }
  }
  return best;
}
