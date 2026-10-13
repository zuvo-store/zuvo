import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { groqChat } from "@/lib/groq";

/**
 * POST /api/admin/ai/marketing — social media captions for a product.
 * Admin only. Body: { name, price, platform: "instagram"|"facebook"|"whatsapp", shortDesc? }
 */
export async function POST(req: NextRequest) {
  const me = await getSessionUser();
  if (!me || me.role !== "ADMIN") {
    return NextResponse.json({ ok: false, error: "Admin only" }, { status: 403 });
  }
  try {
    const { name, price, platform, shortDesc } = (await req.json().catch(() => ({}))) as {
      name?: string; price?: number; platform?: string; shortDesc?: string;
    };
    if (!name) return NextResponse.json({ ok: false, error: "Product name required" }, { status: 400 });
    const plat = ["instagram", "facebook", "whatsapp"].includes(platform ?? "") ? platform! : "instagram";
    const style: Record<string, string> = {
      instagram: "Instagram post: catchy hook, 2-3 short lines, 8-10 relevant hashtags, 3-4 emojis. Under 150 words.",
      facebook: "Facebook post: friendly longer caption, storytelling angle, 2-3 hashtags, question to drive comments. Under 120 words.",
      whatsapp: "WhatsApp broadcast: short punchy message with price, one emoji per line, clear call to action with link placeholder [LINK]. Under 60 words.",
    };
    const text = await groqChat({
      system: `You write viral social media posts for ZUVO marketplace. Format: ${style[plat]} Return ONLY the post text, no explanations.`,
      user: `Product: ${name}\nPrice: $${(price ?? 0).toFixed(2)}${shortDesc ? `\nAbout: ${shortDesc}` : ""}\nStore: ZUVO — Discover More. Shop Smarter.`,
      maxTokens: 400,
      temperature: 0.8,
    });
    if (!text) return NextResponse.json({ ok: false, error: "AI unavailable" }, { status: 502 });
    return NextResponse.json({ ok: true, post: text });
  } catch {
    return NextResponse.json({ ok: false, error: "Something went wrong" }, { status: 500 });
  }
}
