import { NextRequest, NextResponse } from "next/server";
import { groqChat, GROQ_VISION_MODEL } from "@/lib/groq";
import { aiRankProducts, getRankableCatalog } from "@/lib/ai-search";
import { db } from "@/lib/db";
import { toListItem } from "@/app/_shop/query";

/**
 * POST /api/search/visual — upload a photo, find similar products.
 * Accepts multipart FormData with an "image" file (max ~4MB).
 * Vision AI describes the photo, then AI search ranks matching products.
 */
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData().catch(() => null);
    const file = form?.get("image");
    if (!file || !(file instanceof Blob) || file.size === 0) {
      return NextResponse.json({ ok: false, error: "No image uploaded" }, { status: 400 });
    }
    if (file.size > 4 * 1024 * 1024) {
      return NextResponse.json({ ok: false, error: "Image too large (max 4MB)" }, { status: 400 });
    }
    // Downscale server-side: vision is faster + more reliable on small images.
    let buf = Buffer.from(await file.arrayBuffer());
    let mime = "image/jpeg";
    try {
      const sharp = (await import("sharp")).default;
      buf = await sharp(buf).resize(768, 768, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 70 }).toBuffer();
    } catch {
      mime = file.type || "image/jpeg"; // fall back to original bytes
    }
    const dataUrl = `data:${mime};base64,${buf.toString("base64")}`;

    // Step 1: vision model describes what's in the photo.
    const description = await groqChat({
      model: GROQ_VISION_MODEL,
      system: `You are a shopping assistant. Look at the photo and describe the main product in it as a shopping search query: product type, color, style, material, and any visible brand or distinctive features. Be specific and concise (1-2 sentences). If there are multiple products, describe the most prominent one. Return ONLY the description.`,
      user: [
        { type: "image_url", image_url: { url: dataUrl } },
        { type: "text", text: "What product is shown in this photo? Describe it for a product search." },
      ],
      maxTokens: 200,
      temperature: 0.3,
    });
    if (!description) {
      return NextResponse.json({ ok: false, error: "Could not analyze the image" }, { status: 502 });
    }

    // Step 2: rank catalog products by the description.
    const catalog = await getRankableCatalog();
    let ids: string[] = [];
    try {
      ids = await aiRankProducts(description, catalog);
    } catch {
      ids = [];
    }
    if (ids.length === 0) {
      return NextResponse.json({ ok: true, description, items: [] });
    }
    const rows = await db.product.findMany({ where: { id: { in: ids }, active: true } });
    const byId = new Map(rows.map((p) => [p.id, p]));
    const items = ids.map((id) => byId.get(id)).filter((p) => !!p).map((p) => toListItem(p!));
    return NextResponse.json({ ok: true, description, items });
  } catch {
    return NextResponse.json({ ok: false, error: "Something went wrong" }, { status: 500 });
  }
}
