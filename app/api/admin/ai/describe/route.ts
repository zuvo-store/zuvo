import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { groqChat } from "@/lib/groq";

/**
 * POST /api/admin/ai/describe — generate a compelling product description.
 * Admin only. Body: { name, brand?, category?, shortDesc? }
 */
export async function POST(req: NextRequest) {
  const me = await getSessionUser();
  if (!me || me.role !== "ADMIN") {
    return NextResponse.json({ ok: false, error: "Admin only" }, { status: 403 });
  }
  try {
    const { name, brand, category, shortDesc } = (await req.json().catch(() => ({}))) as {
      name?: string;
      brand?: string;
      category?: string;
      shortDesc?: string;
    };
    if (!name || !name.trim()) {
      return NextResponse.json({ ok: false, error: "Product name is required" }, { status: 400 });
    }
    const text = await groqChat({
      system: `You write punchy e-commerce product descriptions for ZUVO, a Temu-style marketplace. Write a compelling description of 3-5 sentences: hook the shopper, highlight benefits and use cases, end with a light call to action. No hype words like "revolutionary", no ALL CAPS, no emojis. Return ONLY the description text.`,
      user: `Product: ${name.trim()}${brand ? `\nBrand: ${brand}` : ""}${category ? `\nCategory: ${category}` : ""}${shortDesc ? `\nShort summary: ${shortDesc}` : ""}`,
      maxTokens: 300,
      temperature: 0.7,
    });
    if (!text) {
      return NextResponse.json({ ok: false, error: "AI unavailable right now" }, { status: 502 });
    }
    return NextResponse.json({ ok: true, description: text });
  } catch {
    return NextResponse.json({ ok: false, error: "Something went wrong" }, { status: 500 });
  }
}
