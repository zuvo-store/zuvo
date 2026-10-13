/**
 * Shared Groq AI helper (free tier). Used by AI search, recommendations,
 * product descriptions, visual search, and Zuzu support.
 * Returns the model's text reply, or null when unavailable/failed.
 */

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

export const GROQ_TEXT_MODEL = "openai/gpt-oss-120b";
export const GROQ_VISION_MODEL = "meta-llama/llama-4-maverick-17b-128e-instruct";

type ChatMessage = {
  role: "system" | "user";
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
};

export async function groqChat(opts: {
  model?: string;
  system: string;
  user: string | ChatMessage["content"];
  maxTokens?: number;
  temperature?: number;
  jsonMode?: boolean;
  retries?: number;
}): Promise<string | null> {
  const key = process.env.GROQ_API_KEY;
  if (!key) return null;
  const attempts = Math.max(1, (opts.retries ?? 1) + 1);
  for (let a = 0; a < attempts; a++) {
    try {
      const res = await fetch(GROQ_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model: opts.model ?? GROQ_TEXT_MODEL,
          max_tokens: opts.maxTokens ?? 500,
          temperature: opts.temperature ?? 0.5,
          ...(opts.jsonMode ? { response_format: { type: "json_object" } } : {}),
          messages: [
            { role: "system", content: opts.system },
            { role: "user", content: opts.user },
          ],
        }),
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        console.error(`groqChat failed: ${res.status} model=${opts.model ?? GROQ_TEXT_MODEL} ${errText.slice(0, 200)}`);
        return null;
      }
      const d = await res.json();
      const text = d?.choices?.[0]?.message?.content?.trim();
      if (text) return text;
      console.error(`groqChat empty reply (attempt ${a + 1}/${attempts}): model=${opts.model ?? GROQ_TEXT_MODEL}`);
    } catch (e) {
      console.error(`groqChat exception: model=${opts.model ?? GROQ_TEXT_MODEL} ${e instanceof Error ? e.message : String(e)}`);
      return null;
    }
  }
  return null;
}

/** Extract a JSON array of strings from a model reply (tolerates fences/prose). */
export function extractIdList(text: string | null): string[] {
  if (!text) return [];
  const m = text.match(/\[[\s\S]*?\]/);
  if (!m) return [];
  try {
    const arr = JSON.parse(m[0]);
    return Array.isArray(arr) ? arr.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}
