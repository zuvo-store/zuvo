import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { groqChat } from "@/lib/groq";

/**
 * POST /api/admin/ai/seo — generate SEO title + meta description for a product.
 * Admin only. Body: { name, brand?, category?, shortDesc? }
 */
export async function POST(req: NextRequest) {
  const me = await getSessionUser();
  if (!me || me.role !== "ADMIN") {
    return NextResponse.json({ ok: false, error: "Admin only" }, { status: 403 });
  }
  try {
    const { name, brand, category, shortDesc } = (await req.json().catch(() => ({}))) as {
      name?: string; brand?: string; category?: string; shortDesc?: string;
    };
    if (!name || !name.trim()) {
      return NextResponse.json({ ok: false, error: "Product name is required" }, { status: 400 });
    }
    const text = await groqChat({
      system: `You are an e-commerce SEO expert. For the given product, reply in EXACTLY this format (two lines, nothing else):
TITLE: <seo title under 60 chars, includes product name and a buying keyword>
DESC: <meta description under 160 chars, compelling, with a benefit and call to action>`,
      user: `Product: ${name.trim()}${brand ? `\nBrand: ${brand}` : ""}${category ? `\nCategory: ${category}` : ""}${shortDesc ? `\nSummary: ${shortDesc}` : ""}`,
      maxTokens: 300,
      temperature: 0.5,
      retries: 2,
    });
    if (!text) return NextResponse.json({ ok: false, error: "AI unavailable" }, { status: 502 });
    const titleM = text.match(/TITLE:\s*(.+)/i);
    const descM = text.match(/DESC:\s*(.+)/i);
    const seoTitle = titleM?.[1]?.trim();
    const seoDescription = descM?.[1]?.trim();
    if (!seoTitle || !seoDescription) {
      return NextResponse.json({ ok: false, error: "AI returned invalid format" }, { status: 502 });
    }
    return NextResponse.json({ ok: true, seoTitle, seoDescription });
  } catch {
    return NextResponse.json({ ok: false, error: "Something went wrong" }, { status: 500 });
  }
}
