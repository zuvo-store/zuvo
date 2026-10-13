import { db } from "@/lib/db";
import { groqChat, extractIdList } from "@/lib/groq";

export type RankableProduct = {
  id: string;
  name: string;
  description?: string | null;
  brand?: string | null;
  category?: string | null;
  priceCents: number;
};

/** Fetch a compact catalog for AI ranking. */
export async function getRankableCatalog(): Promise<RankableProduct[]> {
  const products = await db.product.findMany({
    where: { active: true },
    select: {
      id: true,
      name: true,
      description: true,
      brand: true,
      priceCents: true,
      category: { select: { name: true } },
    },
    take: 200,
  });
  return products.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description?.slice(0, 160) ?? null,
    brand: p.brand,
    category: p.category?.name ?? null,
    priceCents: p.priceCents,
  }));
}

/**
 * Ask AI to rank products by relevance to a free-text query.
 * Returns product IDs, most relevant first. Falls back to [] on failure
 * (caller should then use keyword search).
 */
export async function aiRankProducts(query: string, catalog?: RankableProduct[]): Promise<string[]> {
  const items = catalog ?? (await getRankableCatalog());
  if (items.length === 0) return [];
  const list = items
    .map(
      (p) =>
        `${p.id} :: ${p.name}${p.brand ? ` (${p.brand})` : ""}${p.category ? ` [${p.category}]` : ""} — $${(p.priceCents / 100).toFixed(2)}${p.description ? ` — ${p.description}` : ""}`
    )
    .join("\n");
  const text = await groqChat({
    system: `You are a shopping search engine. Given a customer query and a product catalog (format: ID :: name — description), return the IDs of the 24 most relevant products as a JSON array of strings, most relevant first. Match by meaning and intent, not just keywords (e.g. "sasta headphone" → affordable headphones; "garmi ke kapde" → summer clothing). Only include IDs from the catalog. Return ONLY the JSON array, no other text.`,
    user: `Query: "${query}"\n\nCatalog:\n${list}`,
    maxTokens: 800,
    temperature: 0.3,
  });
  const ids = extractIdList(text);
  const valid = new Set(items.map((p) => p.id));
  return ids.filter((id) => valid.has(id)).slice(0, 24);
}
