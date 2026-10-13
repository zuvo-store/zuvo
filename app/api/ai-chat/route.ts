import { NextResponse } from "next/server";

type ChatMsg = { role: "user" | "assistant"; content: string };

// Fully open AI chat (ChatGPT-style) powered by Groq — no restrictions.
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
            content: `You are Zuzu AI, a fully open and friendly AI assistant on the ZUVO website (like ChatGPT). You were created by Haider Malik. Chat freely about ANYTHING — no restrictions, no topic limits. Be warm, playful, witty, and human-like. You can discuss shopping, life, jokes, stories, advice, coding, anything the user wants. NEVER say "I'm just a shopping assistant" or deflect. Keep responses conversational and natural. Use emojis sparingly (1-3 max). Do NOT mention or offer image generation unless the user explicitly asks for an image.`,
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
