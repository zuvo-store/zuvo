import { NextResponse } from "next/server";
import { db } from "@/lib/db";

type ChatMsg = { role: "user" | "assistant"; content: string };

// Fully open AI chat (ChatGPT-style) powered by Groq — no restrictions.
// Has LIVE access to the website's product inventory (fresh from DB on every request).
export async function POST(req: Request) {
  try {
    const { messages } = (await req.json()) as { messages: ChatMsg[] };
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ ok: false, error: "No messages" }, { status: 400 });
    }

    const key = process.env.GROQ_API_KEY;
    if (!key) {
      return NextResponse.json({ ok: false, error: "AI not configured" }, { status: 500 });
    }

    // Live inventory — fresh from database on every single request
    let inventoryBlock = "Inventory currently unavailable.";
    try {
      const products = await db.product.findMany({
        where: { active: true },
        select: { name: true, priceCents: true, originalPriceCents: true, rating: true, category: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 60,
      });
      if (products.length > 0) {
        inventoryBlock =
          `LIVE ZUVO INVENTORY (${products.length} products, fresh right now):\n` +
          products
            .map(
              (p) =>
                `- ${p.name} | $${(p.priceCents / 100).toFixed(2)}${p.originalPriceCents ? ` (was $${(p.originalPriceCents / 100).toFixed(2)})` : ""} | ${p.category?.name ?? "General"} | ⭐${p.rating?.toFixed(1) ?? "N/A"}`
            )
            .join("\n");
      }
    } catch {
      /* inventory stays unavailable — AI still chats normally */
    }

    // Detect image generation request
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    const imgMatch = lastUser?.content.match(/(?:generate|create|make|draw|paint|design|banao|banado)\s+(?:an?\s+)?image\s+(?:of\s+|ka\s+)?(.+)/i);
    if (imgMatch && imgMatch[1]) {
      const prompt = imgMatch[1].trim().slice(0, 500);
      const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true&seed=${Math.floor(Math.random() * 1000000)}`;
      return NextResponse.json({
        ok: true,
        text: `Here's your image! 🎨`,
        imageUrl,
        isImage: true,
      });
    }

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: "openai/gpt-oss-120b",
        max_tokens: 1000,
        temperature: 0.8,
        messages: [
          {
            role: "system",
            content: `You are Zuzu AI, a fully open and friendly AI assistant on the ZUVO website (like ChatGPT). You were created by Haider Malik. Chat freely about ANYTHING — no restrictions, no topic limits. Be warm, playful, witty, and human-like. You can discuss shopping, life, jokes, stories, advice, coding, anything the user wants. NEVER say "I'm just a shopping assistant" or deflect. Keep responses conversational and natural. Use emojis sparingly (1-3 max). Do NOT mention or offer image generation unless the user explicitly asks for an image.
CRITICAL LANGUAGE RULE: ALWAYS reply in the EXACT same language AND script the user is using. If the user writes in Roman Urdu (Urdu words in Latin/English letters like "ksy ho", "tum kaise ho"), reply in Roman Urdu with Latin letters — NEVER switch to Hindi Devanagari or Urdu Arabic script. If the user writes in Urdu script (اردو), reply in Urdu script. If the user writes in English, reply in English. Match their language and script every single time, no exceptions.
WEBSITE INVENTORY ACCESS: You HAVE direct live access to ZUVO's product database (see inventory below, refreshed on every message). When the user asks if something is available on the website ("kia ye website par hai", "is it in stock"), check the inventory list and answer confidently — name the matching products with prices. NEVER say you don't have database access. If a product isn't in the list, say it's not available and suggest similar ones from the inventory.
${inventoryBlock}`,
          },
          ...messages.slice(-20).map((m) => ({ role: m.role, content: m.content })),
        ],
      }),
    });

    if (!res.ok) {
      return NextResponse.json({ ok: false, error: "AI error" }, { status: 500 });
    }
    const d = await res.json();
    const text = d?.choices?.[0]?.message?.content?.trim() || "Hmm, kuch garbar hui. Phir se try karo! 😅";
    return NextResponse.json({ ok: true, text });
  } catch {
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
