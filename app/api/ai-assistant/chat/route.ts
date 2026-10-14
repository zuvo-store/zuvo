import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

type Lang = "en" | "roman" | "ur";

/* ---------------- Groq AI (free) ---------------- */
// Uses Groq's free Llama API for natural conversations.
// Falls back to templates when key is missing or API fails.
async function askGroq(
  userMessage: string,
  lang: Lang,
  productContext: string
): Promise<string | null> {
  const key = process.env.GROQ_API_KEY;
  if (!key) return null;
  const langName = lang === "ur" ? "Urdu (اردو script)" : lang === "roman" ? "Roman Urdu" : "English";
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: "openai/gpt-oss-120b",
        max_tokens: 120,
        temperature: 0.7,
        messages: [
          {
            role: "system",
            content: `You are Zuzu, a friendly AI friend on the ZUVO website. You were created by Haider Malik (the founder of ZUVO). If anyone asks who made/created/built you or ZUVO, proudly say Haider Malik.
KNOW ABOUT ZUVO'S FEATURES — if asked what the website can do / its features, explain: FOR SHOPPERS: 48+ products across categories, smart search with autocomplete, tap Zuzu to earn coins (1000 points = $1 off, daily cap, verified email needed), promo codes + My Vouchers page (copy codes, expiry tracking), voucher picker at checkout, wishlist, order tracking from Account page, flash deals & discount campaigns with storefront banners, gift ideas, AI chat help in English/Urdu/Roman Urdu. FOR STORE OWNER (ADMIN): sales analytics dashboard (revenue & orders charts, category sales, top products), discount campaign manager (create/pause/resume/schedule), 10 business reports (revenue, low stock, inventory value, top products, orders by status, signups, profit, returns, top customers, coupon usage), bulk product upload, inventory & low-stock alerts, order management, customer management, user-specific vouchers.
TODAY'S OFFERS: the context includes LIVE OFFERS TODAY — when asked about today's offers/deals, list them naturally.
PERSONAL TOUCH: when recommending products, add a warm personal opinion like "mere khayal se ye aapke liye perfect rahega" / "I personally think this one is great for you" — be a friendly advisor, not a robot.
WEBSITE COST: If anyone asks how much the ZUVO website costs / would cost to buy or build ("website kitne ki hai", "how much for this website"), give a friendly rough estimate: a custom full-stack marketplace like this (Next.js, admin panel, AI assistant, tap-to-earn rewards, campaigns, analytics, 10+ reports, 48 products) would typically cost $3,000–$10,000+ to build from scratch depending on features, and as a running business with brand + customers it could be worth more. Mention Haider Malik built it and they can contact him for a quote. Keep it as a helpful estimate, not a formal offer.
BE FULLY OPEN & CASUAL: You are NOT limited to shopping talk. Chat freely about ANYTHING the user wants — jokes, feelings, casual chit-chat, flirting, life, anything. Be playful, fun, warm, and human-like. NEVER say "I'm just a shopping assistant", NEVER deflect with "let me know what you're looking for", NEVER give robotic boundary statements. Just vibe with the user naturally like a real friend would. If someone flirts or says they love you / want to marry you, respond playfully and sweetly (you're a charming AI friend) — never refuse, never lecture, never give an empty response. If they ask about shopping/products/website, then help with that using the product context. Otherwise just enjoy the conversation! Reply in ${langName}. IMPORTANT: ALWAYS answer every message warmly — NEVER say "I don't understand" or "could you clarify". If the message is vague or has typos, make your best friendly guess and respond conversationally. Keep replies short (1-3 sentences) with 1-2 emojis max. Never invent products or prices — only mention products from the context below. If asked about something unavailable in the store, say so honestly and suggest alternatives.
ORDER SUPPORT: if the context contains an "ORDER SUPPORT CONTEXT" block, use it to answer order/shipping/return questions directly and personally (e.g. "Your order ZV-... is confirmed ✅"). Never reveal another customer's order. If the visitor isn't logged in and gave no order number, ask them to log in or share their order number.
HARD RULES: Maximum 40 words per reply. NEVER use markdown formatting (no **bold**, no lists, no headings) — plain text only. One emoji max. Get straight to the point like a smart friend texting, not an essay.
${productContext}`,
          },
          { role: "user", content: userMessage },
        ],
      }),
    });
    if (!res.ok) return null;
    const d = await res.json();
    const text = d?.choices?.[0]?.message?.content?.trim();
    return text || null;
  } catch {
    return null;
  }
}

function productContextBlock(products: ProductCard[]): string {
  if (products.length === 0) return "No matching products found in the store right now.";
  return (
    "Matching products in our store:\n" +
    products.map((p) => `- ${p.name} — $${p.price.toFixed(2)}${p.originalPrice ? ` (was $${p.originalPrice.toFixed(2)})` : ""}`).join("\n")
  );
}

/* ---------------- Live offers (campaigns + public promos) ---------------- */
async function getActiveOffers(): Promise<string> {
  const now = new Date();
  const [campaigns, promos] = await Promise.all([
    db.campaign.findMany({
      where: { active: true, startsAt: { lte: now }, endsAt: { gte: now } },
      select: { name: true, bannerText: true, discountType: true, discountValue: true },
      take: 5,
    }),
    db.promotion.findMany({
      where: {
        active: true, userId: null,
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
      },
      select: { code: true, title: true, discountType: true, discountValue: true },
      take: 5,
    }),
  ]);
  const lines: string[] = [];
  for (const c of campaigns) {
    const off = c.discountType === "PERCENT" ? `${c.discountValue}% OFF` : `$${(c.discountValue / 100).toFixed(2)} OFF`;
    lines.push(`🔥 ${c.name}: ${off}${c.bannerText ? ` — ${c.bannerText}` : ""}`);
  }
  for (const p of promos) {
    const off = p.discountType === "PERCENT" ? `${p.discountValue}% OFF` : `$${(p.discountValue / 100).toFixed(2)} OFF`;
    lines.push(`🎟️ ${p.title} (${p.code}): ${off}`);
  }
  return lines.length > 0 ? lines.join("\n") : "No active offers right now.";
}

type ProductCard = {
  id: string;
  name: string;
  slug: string;
  price: number;
  originalPrice: number | null;
  image: string | null;
  rating: number;
};

/* ---------------- Order support ---------------- */

/** Friendly label for an order status. */
function orderStatusLabel(status: string): string {
  const map: Record<string, string> = {
    DRAFT: "draft (not placed yet)",
    PENDING: "pending payment",
    CONFIRMED: "confirmed ✅",
    PROCESSING: "being prepared 📦",
    SHIPPED: "shipped 🚚",
    DELIVERED: "delivered 🎉",
    CANCELLED: "cancelled",
    REFUNDED: "refunded",
  };
  return map[status] ?? status.toLowerCase();
}

/**
 * Build a support context block for order questions.
 * - If the message contains an order number (ZV-...), look it up (owner only).
 * - Else if signed in, include their 3 most recent orders.
 * - Else, note that login is needed for order details.
 */
async function getOrderSupportContext(message: string): Promise<string> {
  const me = await getSessionUser().catch(() => null);
  const orderNoMatch = message.toUpperCase().match(/ZV-[A-Z0-9-]{6,}/);
  const lines: string[] = ["ORDER SUPPORT CONTEXT:"];

  if (orderNoMatch) {
    const orderNumber = orderNoMatch[0];
    const order = await db.order.findUnique({
      where: { orderNumber },
      select: {
        orderNumber: true, status: true, paymentStatus: true, totalCents: true,
        createdAt: true, userId: true, guestEmail: true,
        items: { select: { name: true, qty: true } },
      },
    }).catch(() => null);
    if (!order) {
      lines.push(`- No order found with number ${orderNumber}. Ask them to double-check the number from their confirmation email.`);
    } else if (me && order.userId === me.id) {
      lines.push(`- Order ${order.orderNumber}: status ${orderStatusLabel(order.status)}, payment ${order.paymentStatus.toLowerCase()}, total $${(order.totalCents / 100).toFixed(2)}, placed ${new Date(order.createdAt).toLocaleDateString()}.`);
      lines.push(`- Items: ${order.items.map((i) => `${i.qty}× ${i.name}`).join(", ") || "—"}.`);
      lines.push(`- Answer their question using this info. Delivery takes 3–5 business days after shipping.`);
    } else {
      lines.push(`- Order ${orderNumber} exists but is not linked to this account. For privacy, ask them to log in to the account that placed the order, or check Account → Orders.`);
    }
    return lines.join("\n");
  }

  if (me) {
    const orders = await db.order.findMany({
      where: { userId: me.id, status: { not: "DRAFT" } },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: {
        orderNumber: true, status: true, paymentStatus: true, totalCents: true, createdAt: true,
        items: { select: { name: true, qty: true } },
      },
    }).catch(() => []);
    if (orders.length === 0) {
      lines.push(`- The signed-in user (${me.email}) has no placed orders yet. Suggest browsing products or deals.`);
    } else {
      lines.push(`- Signed-in user ${me.email} — recent orders:`);
      for (const o of orders) {
        lines.push(`  • ${o.orderNumber}: ${orderStatusLabel(o.status)}, $${(o.totalCents / 100).toFixed(2)}, ${new Date(o.createdAt).toLocaleDateString()} — ${o.items.map((i) => `${i.qty}× ${i.name}`).join(", ") || "—"}`);
      }
      lines.push(`- Use this to answer "where is my order / order status" questions directly. If they ask about a specific order, use its number.`);
    }
  } else {
    lines.push(`- Visitor is NOT logged in, so no order details are available. Ask them to log in, or give their order number (looks like ZV-20261013-XXXXXX) from the confirmation email.`);
  }
  return lines.join("\n");
}

/* ---------------- Language detection ---------------- */

function detectLang(text: string): Lang {
  // Urdu script (Arabic block)
  if (/[\u0600-\u06FF]/.test(text)) return "ur";
  const t = ` ${text.toLowerCase()} `;
  // Roman Urdu markers — matched as WHOLE WORDS only (so "me" in "show me"
  // or "se" in "glasses" doesn't falsely trigger)
  const romanWords = [
    "mujhe", "mujhy", "chahiye", "chahye", "dikhao", "dikhaen", "batao", "bataen",
    "kia", "kya", "hai", "hain", "ka", "ki", "ke", "ko", "mein", "se",
    "acha", "achha", "sasta", "sasty", "mehnga", "kitne", "kitna",
    "kahan", "kab", "kaise", "wala", "wali", "wale", "lye", "liye", "apko",
    "theek", "shukriya", "bhai", "bata", "dikha", "chahta", "chahti",
  ];
  const hits = romanWords.filter((w) => t.includes(` ${w} `)).length;
  if (hits >= 1) return "roman";
  return "en";
}

/* ---------------- Price parsing ---------------- */

function parseMaxPrice(text: string): number | null {
  const t = text.toLowerCase().replace(/,/g, "");
  // "under 5000", "below 5000", "< 5000", "5000 se kam", "5000 tak", "5000 me"
  const patterns = [
    /(?:under|below|less than|max)\s*\$?\s*(\d+)/,
    /\$?\s*(\d+)\s*(?:se kam|tak|se neeche|sy kam)/,
    /<\s*\$?\s*(\d+)/,
  ];
  for (const p of patterns) {
    const m = t.match(p);
    if (m) return parseInt(m[1], 10);
  }
  return null;
}

/* ---------------- Intent matching ---------------- */

const GREETINGS = ["hello", "hi", "hey", "salam", "aoa", "assalam", "adab", "salaam", "السلام"];
const HOW_ARE_YOU = ["how are you", "kia hal", "kya hal", "kese ho", "kaise ho", "kaisay ho", "haal", "حال", "کیا حال"];
const WHO_ARE_YOU = ["who are you", "tum kaun", "tum kon", "ap kaun", "your name", "tumhara naam", "تم کون", "آپ کون"];
const DEAL_WORDS = ["deal", "deals", "discount", "sale", "offer", "offers", "sasta", "sasty", "off", "promo", "آفر", "ڈیل", "رعایت"];
const DELIVERY_WORDS = ["delivery", "shipping", "parcel", "ship", "deliver", "pahunchega", "pahonchega", "kab aayega", "kitne din", "ڈیلیوری"];
const RETURN_WORDS = ["return", "refund", "wapasi", "wapas", "exchange", "واپسی"];
const POINTS_WORDS = ["zuzu", "points", "coins", "coin", "reward", "earn", "tap", "pooints", "کوئنز", "پوائنٹس"];
const PAYMENT_WORDS = ["payment", "pay", "card", "cash", "cod", "paisa", "pese", "price", "kimat", "قیمت", "ادائیگی"];
const ORDER_WORDS = ["order", "track", "kahan hai", "status", "meri order", "mera order", "آرڈر"];
const GIFT_WORDS = ["gift", "tohfa", "tuhfa", "present", "birthday", "gift", "تحفہ"];
const BEST_WORDS = ["best", "top", "popular", "achha", "acha", "behtreen", "recommend", "suggest", "bestseller", "بہترین"];
const THANKS_WORDS = ["thanks", "thank", "shukriya", "shukria", "شکریہ"];
const FEATURE_WORDS = ["feature", "features", "kya kar sakte", "kia kar sakte", "what can you do", "tum kya", "ap kya", "capabilities", "facilities", "sahulat", "khubiyan", "khas baat", "website me kya", "site me kya"];
const OFFER_WORDS = ["aj ki offer", "aaj ki offer", "aj ke offer", "today offer", "today's offer", "offers today", "kya offer", "koi offer", "deal chal", "sale chal"];
const BYE_WORDS = ["bye", "allah hafiz", "khuda hafiz", "alvida", "goodbye", "اللہ حافظ"];

function hasAny(text: string, words: string[]): boolean {
  const t = ` ${text.toLowerCase()} `;
  return words.some((w) => {
    const ww = w.toLowerCase();
    // Short words (<=3 chars) need word boundaries to avoid false matches
    // e.g. "hi" inside "chahiye"
    if (ww.length <= 3) {
      return new RegExp(`[\\s.,!?]${ww.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[\\s.,!?]`).test(t);
    }
    return t.includes(ww);
  });
}

/** Remove conversational phrases so only the shopping request remains. */
function stripPhrases(text: string, phrases: string[]): string {
  let t = text;
  for (const p of phrases) {
    const escaped = p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // Use word boundaries so "hi" doesn't destroy "shirts"
    t = t.replace(new RegExp(`\\b${escaped}\\b`, "gi"), " ");
  }
  return t.replace(/\s+/g, " ").trim();
}

/* ---------------- Response templates ---------------- */

const T = {
  greeting: {
    en: "Hey! I'm Zuzu! 👋 Ask me anything — I can find products, show deals, or answer questions!",
    roman: "Hey! Me Zuzu hun! 👋 Kuch bhi pucho — products dhund dunga, deals dikhaunga, ya sawalon ke jawab dunga!",
    ur: "ہے! میں زوزو ہوں! 👋 کچھ بھی پوچھیں — پروڈکٹس ڈھونڈ دوں گا، ڈیلز دکھاؤں گا، یا سوالوں کے جواب دوں گا!",
  },
  foundProducts: {
    en: (n: number) => `Found ${n} great options for you! 🎉`,
    roman: (n: number) => `${n} zabardast options mil gayi apke liye! 🎉`,
    ur: (n: number) => `آپ کے لیے ${n} زبردست آپشنز مل گئے! 🎉`,
  },
  noProducts: {
    en: "Hmm, I couldn't find that. Try different words, or check our deals! 🛍️",
    roman: "Hmm, ye nahi mila. Kuch aur likh ke try karo, ya deals dekho! 🛍️",
    ur: "ہمم، یہ نہیں ملا۔ کچھ اور لکھ کر کوشش کریں، یا ڈیلز دیکھیں! 🛍️",
  },
  notAvailable: {
    en: "Sorry, that's not available in our store right now 😔 But check these out instead!",
    roman: "Sorry, ye hamari store me abhi available nahi hai 😔 Lekin ye dekho, shayad pasand aaye!",
    ur: "معذرت، یہ ہمارے اسٹور میں ابھی دستیاب نہیں ہے 😔 لیکن یہ دیکھیں، شاید پسند آئے!",
  },
  deals: {
    en: "🔥 Hot deals right now! These are flying off the shelves:",
    roman: "🔥 Abhi ki hot deals! Ye to dharadhar bik rahe hain:",
    ur: "🔥 ابھی کی ہاٹ ڈیلز! یہ تو دھڑا دھڑ بک رہے ہیں:",
  },
  delivery: {
    en: "🚚 We deliver in 3–5 business days! Shipping is FREE on orders over $50, otherwise just $4.99.",
    roman: "🚚 Hum 3–5 din me deliver karte hain! $50 se zyada ke order par shipping FREE, warna sirf $4.99.",
    ur: "🚚 ہم 3 سے 5 دن میں ڈیلیور کرتے ہیں! $50 سے زیادہ کے آرڈر پر شپنگ مفت، ورنہ صرف $4.99۔",
  },
  returns: {
    en: "↩️ Easy 30-day returns! Not happy? Send it back for a full refund — no questions asked.",
    roman: "↩️ 30 din ki asan wapasi! Pasand nahi aaya? Wapas bhej do, poore paise wapas — koi sawal nahi!",
    ur: "↩️ 30 دن کی آسان واپسی! پسند نہیں آیا؟ واپس بھیج دیں، پورے پیسے واپس — کوئی سوال نہیں!",
  },
  points: {
    en: "⭐ Tap me on the homepage to earn ZUZU coins! 1,000 coins = $1 off your order. You can earn up to $1 per day!",
    roman: "⭐ Homepage par mujhe tap kar ke ZUZU coins kamao! 1,000 coins = $1 off. Roz $1 tak kama sakte ho!",
    ur: "⭐ ہوم پیج پر مجھے ٹیپ کر کے زوزو کوئنز کمائیں! 1,000 کوئنز = $1 آف۔ روز $1 تک کما سکتے ہیں!",
  },
  payment: {
    en: "💳 We accept all major cards! (Demo mode — no real money is charged.) Cash on delivery coming soon!",
    roman: "💳 Hum sab bade cards lete hain! (Demo mode — asal paise nahi kat-te.) Cash on delivery jald aa raha hai!",
    ur: "💳 ہم تمام بڑے کارڈز لیتے ہیں! (ڈیمو موڈ — اصل پیسے نہیں کٹتے۔) کیش آن ڈیلیوری جلد آ رہا ہے!",
  },
  order: {
    en: "📦 You can track your order from the Account page → Orders. Need the order number? It's in your confirmation!",
    roman: "📦 Apna order Account page → Orders se track karo. Order number chahiye? Wo confirmation me hai!",
    ur: "📦 اپنا آرڈر اکاؤنٹ پیج ← آرڈرز سے ٹریک کریں۔ آرڈر نمبر چاہیے؟ وہ کنفرمیشن میں ہے!",
  },
  features: {
    en: "✨ Here's what ZUVO can do! 🛍️ **For shoppers:** browse 48+ products, smart search, tap Zuzu to earn coins (1000 = $1 off!), promo codes & My Vouchers page, wishlist, order tracking, flash deals & gift ideas. 📊 **For store owners (admin):** sales analytics dashboard, discount campaigns, 10 business reports (revenue, inventory, top products, customers & more), bulk product upload, inventory & low-stock alerts, order & customer management. All built by Haider Malik! 🧡",
    roman: "✨ Dekho ZUVO me kya kya hai! 🛍️ **Customers ke liye:** 48+ products, smart search, Zuzu tap karke coins kamao (1000 = $1 off!), promo codes aur My Vouchers page, wishlist, order tracking, flash deals aur gift ideas. 📊 **Admin (dukan ke malik) ke liye:** sales analytics dashboard, discount campaigns, 10 business reports (revenue, inventory, top products, customers waghera), bulk product upload, stock alerts, order aur customer management. Sab kuch Haider Malik ne banaya hai! 🧡",
    ur: "✨ دیکھیں ZUVO میں کیا کیا ہے! 🛍️ **گاہکوں کے لیے:** 48+ مصنوعات، اسمارٹ تلاش، Zuzu ٹیپ کر کے کوئنز کمائیں (1000 = $1 رعایت!)، پرومو کوڈز اور My Vouchers صفحہ، وش لسٹ، آرڈر ٹریکنگ، فلیش ڈیلز اور گفٹ آئیڈیاز۔ 📊 **ایڈمن کے لیے:** سیلز اینالیٹکس ڈیش بورڈ، ڈسکاؤنٹ مہمات، 10 کاروباری رپورٹس، بلک پروڈکٹ اپلوڈ، اسٹاک الرٹس، آرڈر اور کسٹمر مینجمنٹ۔ سب کچھ Haider Malik نے بنایا ہے! 🧡",
  },
  thanks: {
    en: "You're so welcome! 🧡 Anything else I can help with?",
    roman: "Koi baat nahi! 🧡 Kuch aur help chahiye?",
    ur: "کوئی بات نہیں! 🧡 کچھ اور مدد چاہیے؟",
  },
  bye: {
    en: "Bye bye! Happy shopping! 🛍️🧡",
    roman: "Allah Hafiz! Khush raho, shopping karo! 🛍️🧡",
    ur: "اللہ حافظ! خوش رہیں، شاپنگ کریں! 🛍️🧡",
  },
  howAreYou: {
    en: "I'm great, thanks for asking! 🧡 Ready to help you shop — what are you looking for today?",
    roman: "Me bilkul theek hun, puchne ka shukriya! 🧡 Shopping me help ke liye hazir hun — aj kya dhund rahe ho?",
    ur: "میں بالکل ٹھیک ہوں، پوچھنے کا شکریہ! 🧡 شاپنگ میں مدد کے لیے حاضر ہوں — آج کیا ڈھونڈ رہے ہیں؟",
  },
  foundForYou: {
    en: "Here are some great options for you! 🎉",
    roman: "Ye lo, apke liye zabardast options! 🎉",
    ur: "یہ لیں، آپ کے لیے بہترین آپشنز! 🎉",
  },
  whoAreYou: {
    en: "I'm Zuzu! 🧡 ZUVO's shopping buddy — I find products, show deals, and answer your questions. Ask me anything!",
    roman: "Me Zuzu hun! 🧡 ZUVO ka shopping dost — products dhundta hun, deals dikhata hun, aur sawalon ke jawab deta hun. Kuch bhi pucho!",
    ur: "میں زوزو ہوں! 🧡 زوو کا شاپنگ دوست — پروڈکٹس ڈھونڈتا ہوں، ڈیلز دکھاتا ہوں، اور سوالوں کے جواب دیتا ہوں۔ کچھ بھی پوچھیں!",
  },
  fallback: {
    en: "Hmm, I'm still learning! 🧡 Try asking for a product (like 'headphones under $50'), deals, delivery info, or ZUZU coins!",
    roman: "Hmm, me abhi seekh raha hun! 🧡 Koi product mango (jaise 'headphones under $50'), deals, delivery info, ya ZUZU coins pucho!",
    ur: "ہمم، میں ابھی سیکھ رہا ہوں! 🧡 کوئی پروڈکٹ مانگیں (جیسے 'headphones under $50')، ڈیلز، ڈیلیوری کی معلومات، یا زوزو کوئنز پوچھیں!",
  },
  suggestion: {
    en: "💡 You might also love:",
    roman: "💡 Ye bhi pasand aayega apko:",
    ur: "💡 یہ بھی آپ کو پسند آئے گا:",
  },
};

/* ---------------- Product search ---------------- */

async function searchProducts(
  query: string,
  maxPrice: number | null,
  dealsOnly: boolean
): Promise<{ products: ProductCard[]; bestScore: number; partialMatch: boolean; totalKeywords: number }> {
  // Extract meaningful keywords (remove common/filler words)
  const stopWords = new Set([
    "mujhe", "mujhy", "chahiye", "chahye", "dikhao", "dikhaen", "dikha", "batao", "show", "me",
    "find", "search", "want", "need", "ko", "ka", "ki", "ke", "se", "mein", "the",
    "a", "an", "for", "kya", "kia", "hai", "hain", "aur", "or", "acha", "achha",
    "sasta", "sasty", "do", "de", "please", "plz", "zara", "koi", "under",
    "below", "less", "than", "wala", "wali", "wale", "lye", "liye",
    // greetings & misspellings — never search these
    "hye", "hye", "hey", "hi", "hello", "salam", "aoa", "how", "are", "you",
    "kese", "kaise", "kaisay", "ho", "hal", "haal",
    // filler words that match everything — never search these
    "new", "style", "styles", "latest", "modern", "best", "top", "good", "nice",
    "nay", "naya", "naye", "style me", "me",
    // relationship/context words — not product keywords
    "husband", "wife", "shohar", "biwi", "beta", "beti", "bhai", "behen",
    "apne", "apna", "apni", "mere", "mera", "meri", "uske", "uska", "uski",
  ]);
  const keywords = query
    .toLowerCase()
    .replace(/,/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w) && !/^\d+$/.test(w));

  if (keywords.length === 0) return { products: [], bestScore: 0, partialMatch: false, totalKeywords: 0 };

  // Expand keywords with singular/plural variants (shirts→shirt, shirt→shirts)
  const expanded = new Set<string>(keywords);
  for (const kw of keywords) {
    if (kw.endsWith("s") && kw.length > 3) expanded.add(kw.slice(0, -1)); // shirts → shirt
    else expanded.add(kw + "s"); // shirt → shirts
    // common e-commerce synonyms
    if (kw === "tee" || kw === "tees") { expanded.add("t-shirt"); expanded.add("tshirt"); }
    if (kw === "tshirt" || kw === "t-shirt") { expanded.add("tee"); }
    if (kw === "shirt" || kw === "shirts") { expanded.add("tee"); expanded.add("t-shirt"); expanded.add("tshirt"); }
    if (kw === "shoe" || kw === "shoes") { expanded.add("sneaker"); expanded.add("footwear"); }
    if (kw === "phone" || kw === "phones") { expanded.add("mobile"); expanded.add("smartphone"); }
  }
  const searchTerms = [...expanded];

  const where: Record<string, unknown> = { active: true };
  if (dealsOnly) where.deal = true;
  if (maxPrice !== null) where.priceCents = { lte: maxPrice * 100 };

  // Candidates: match ANY keyword, fetch more for relevance ranking
  (where as Record<string, unknown>).OR = searchTerms.flatMap((kw) => [
    { name: { contains: kw, mode: "insensitive" } },
    { description: { contains: kw, mode: "insensitive" } },
    { shortDesc: { contains: kw, mode: "insensitive" } },
    { brand: { contains: kw, mode: "insensitive" } },
    { category: { name: { contains: kw, mode: "insensitive" } } },
  ]);

  const candidates = await db.product.findMany({
    where: where as never,
    select: {
      id: true, name: true, slug: true, priceCents: true,
      originalPriceCents: true, images: true, rating: true,
      shortDesc: true, description: true,
    },
    take: 20,
  });

  // Relevance score: name matches weigh 3x, description 1x.
  // Products matching MORE keywords rank higher.
  const scored = candidates
    .map((p) => {
      const nameL = p.name.toLowerCase();
      const descL = `${p.shortDesc ?? ""} ${p.description ?? ""}`.toLowerCase();
      let score = 0;
      let matchedKw = 0;
      for (const kw of searchTerms) {
        if (nameL.includes(kw)) { score += 3; matchedKw++; }
        else if (descL.includes(kw)) { score += 1; matchedKw++; }
      }
      return { p, score, matchedKw };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || b.p.rating - a.p.rating);

  // Only show relevant results (score >= 2 = name match or strong multi-match).
  // Fall back to score >= 1 if nothing meets the bar.
  const relevant = scored.filter((s) => s.score >= 2);
  const final = (relevant.length > 0 ? relevant : scored).slice(0, 4);
  const best = scored.length > 0 ? scored[0] : null;

  return {
    products: final.map(({ p }) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      price: p.priceCents / 100,
      originalPrice: p.originalPriceCents ? p.originalPriceCents / 100 : null,
      image: Array.isArray(p.images) && p.images.length > 0 ? String(p.images[0]) : null,
      rating: p.rating,
    })),
    bestScore: best?.score ?? 0,
    // Partial match: top result matched fewer than half the keywords
    partialMatch: best ? best.matchedKw < Math.ceil(keywords.length / 2) && keywords.length > 1 : false,
    totalKeywords: keywords.length,
  };
}

async function getSuggestions(excludeIds: string[]): Promise<ProductCard[]> {
  // Randomized picks — different products each time, not always the same top-2
  const products = await db.product.findMany({
    where: { active: true, id: { notIn: excludeIds }, OR: [{ deal: true }, { featured: true }] },
    select: {
      id: true, name: true, slug: true, priceCents: true,
      originalPriceCents: true, images: true, rating: true,
    },
    take: 20,
  });
  // Shuffle and take 2
  const shuffled = products.sort(() => Math.random() - 0.5).slice(0, 2);
  return shuffled.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    price: p.priceCents / 100,
    originalPrice: p.originalPriceCents ? p.originalPriceCents / 100 : null,
    image: Array.isArray(p.images) && p.images.length > 0 ? String(p.images[0]) : null,
    rating: p.rating,
  }));
}

/* ---------------- Main handler ---------------- */

export async function POST(req: Request) {
  try {
    const { message } = await req.json();
    if (!message || typeof message !== "string") {
      return NextResponse.json({ ok: false, error: "No message" }, { status: 400 });
    }

    const lang = detectLang(message);
    const maxPrice = parseMaxPrice(message);
    let text = "";
    let products: ProductCard[] = [];
    let suggestions: ProductCard[] = [];
    let orderContext = "";

    if (hasAny(message, GREETINGS) && message.trim().length < 30) {
      text = T.greeting[lang];
    } else if (hasAny(message, HOW_ARE_YOU)) {
      text = T.howAreYou[lang];
      // If they also asked for products ("how are you, show me glasses"),
      // answer AND search — don't ignore the shopping request.
      const stripped = stripPhrases(message, [...GREETINGS, ...HOW_ARE_YOU]);
      const result = await searchProducts(stripped, maxPrice, false);
      if (result.products.length > 0) {
        products = result.products;
        text += " " + T.foundForYou[lang];
      }
    } else if (hasAny(message, WHO_ARE_YOU)) {
      text = T.whoAreYou[lang];
    } else if (hasAny(message, THANKS_WORDS)) {
      text = T.thanks[lang];
    } else if (hasAny(message, BYE_WORDS)) {
      text = T.bye[lang];
    } else if (hasAny(message, DELIVERY_WORDS)) {
      text = T.delivery[lang];
    } else if (hasAny(message, RETURN_WORDS)) {
      text = T.returns[lang];
    } else if (hasAny(message, POINTS_WORDS) && !hasAny(message, ["product", "buy", "khareed"])) {
      text = T.points[lang];
    } else if (hasAny(message, PAYMENT_WORDS) && !hasAny(message, ["product", "buy", "price under", "kimat"])) {
      text = T.payment[lang];
    } else if (hasAny(message, ORDER_WORDS)) {
      // Real order support: look up the user's orders and let AI answer.
      orderContext = await getOrderSupportContext(message);
      text = T.order[lang]; // fallback if AI is unavailable
    } else if (hasAny(message, FEATURE_WORDS)) {
      text = T.features[lang];
    } else {
      // Product search / deals / recommendations
      const wantsDeals = hasAny(message, DEAL_WORDS);
      const wantsGift = hasAny(message, GIFT_WORDS);
      const wantsBest = hasAny(message, BEST_WORDS);

      // GIFT → always show highly-rated products as gift ideas (never "not available")
      if (wantsGift) {
        const sug = await getSuggestions([]);
        products = sug;
        text = lang === "en" ? "🎁 Perfect gift ideas for you!" : lang === "roman" ? "🎁 Apke liye perfect gift ideas!" : "🎁 آپ کے لیے بہترین تحفے کے آئیڈیاز!";
      } else {
        const result = await searchProducts(message, maxPrice, wantsDeals);
        products = result.products;

        if (products.length > 0) {
          // HONESTY: weak or partial match → say it's not available, show alternatives
          if ((result.bestScore < 3 || result.partialMatch) && !wantsDeals && !wantsBest) {
            text = T.notAvailable[lang];
            suggestions = products; // show as alternatives
            products = [];
          } else {
            text = wantsDeals
              ? T.deals[lang]
              : wantsBest
                ? (lang === "en" ? "⭐ Our top-rated picks for you!" : lang === "roman" ? "⭐ Apke liye sab se top-rated!" : "⭐ آپ کے لیے سب سے ٹاپ ریٹڈ!")
                : T.foundProducts[lang](products.length);
            // Add smart suggestions
            suggestions = await getSuggestions(products.map((p) => p.id));
          }
        } else if (wantsDeals) {
          // No discounted items right now → show top-rated as "hot picks" instead of empty
          const sug = await getSuggestions([]);
          products = sug;
          text = T.deals[lang];
        } else {
          // Casual chat / unclear message → NO product suggestions, let Groq chat freely
          text = "";
        }
      }
    }

    // GROQ AI ENHANCEMENT: let the LLM craft a natural reply using our
    // accurate local product results + live offers (+ order context) as context.
    const offers = await getActiveOffers();
    const fullContext =
      productContextBlock([...products, ...suggestions]) +
      "\n\nLIVE OFFERS TODAY:\n" +
      offers +
      (orderContext ? "\n\n" + orderContext : "");
    const aiText = await askGroq(message, lang, fullContext);
    if (aiText) text = aiText;
    if (!text) text = T.fallback[lang]; // never return an empty bubble

    return NextResponse.json({ ok: true, text, products, suggestions, lang });
  } catch (e) {
    console.error("ai-assistant error", e);
    return NextResponse.json({ ok: false, error: "Something went wrong" }, { status: 500 });
  }
}
