import { db } from "./db";

export async function getSetting(key: string, fallback = ""): Promise<string> {
  const s = await db.setting.findUnique({ where: { key } });
  return s ? s.value : fallback;
}

export async function setSetting(key: string, value: string) {
  await db.setting.upsert({ where: { key }, create: { key, value }, update: { value } });
}

export async function getAllSettings(): Promise<Record<string, string>> {
  const all = await db.setting.findMany();
  const out: Record<string, string> = {};
  for (const s of all) out[s.key] = s.value;
  return out;
}

/** Gift wrap charge in cents. Admin-adjustable via settings; defaults to 499 ($4.99). */
export async function getGiftWrapCents(): Promise<number> {
  const raw = await getSetting("gift_wrap_cents", "499");
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : 499;
}

/** Announcement bar messages, stored as JSON array of strings. */
export async function getAnnouncements(): Promise<string[]> {
  const raw = await getSetting("announcements", "");
  if (!raw) return ["Discover today's deals.", "Explore new arrivals.", "Special offers on selected products."];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}
