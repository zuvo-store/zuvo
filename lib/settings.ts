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
