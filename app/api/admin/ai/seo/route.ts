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
      system: `You are an e-commerce SEO expert. Write exactly two lines for the product: line 1 is an SEO title (under 60 characters, includes product name), line 2 is a meta description (under 160 characters, compelling).

Example:
Product: Sony WH-1000XM5 Headphones
Sony WH-1000XM5 Headphones - Buy Online | Best Price
Industry-leading noise cancelling headphones with 30-hour battery. Free shipping at ZUVO. Order now!

Now do the same for the product below. Output ONLY the two lines.`,
      user: `Product: ${name.trim()}${brand ? `, Brand: ${brand}` : ""}${category ? `, Category: ${category}` : ""}${shortDesc ? `, About: ${shortDesc}` : ""}`,
      maxTokens: 300,
      temperature: 0.7,
      retries: 2,
    });
    if (!text) return NextResponse.json({ ok: false, error: "AI unavailable" }, { status: 502 });
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    // Strip any "Title:"/"Description:" labels the model might add
    const clean = (l: string) => l.replace(/^(title|seo title|description|meta description)\s*:\s*/i, "").trim();
    const seoTitle = lines[0] ? clean(lines[0]) : "";
    const seoDescription = lines[1] ? clean(lines[1]) : "";
    if (!seoTitle || !seoDescription) {
      return NextResponse.json({ ok: false, error: "AI returned invalid format" }, { status: 502 });
    }
    return NextResponse.json({ ok: true, seoTitle, seoDescription });
  } catch {
    return NextResponse.json({ ok: false, error: "Something went wrong" }, { status: 500 });
  }
}
