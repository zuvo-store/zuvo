import { NextResponse } from "next/server";
import { db } from "@/lib/db";

type Lang = "en" | "roman" | "ur";

type ProductCard = {
  id: string;
  name: string;
  slug: string;
  price: number;
  originalPrice: number | null;
  image: string | null;
  rating: number;
};

/* ---------------- Language detection ---------------- */

function detectLang(text: string): Lang {
  // Urdu script (Arabic block)
  if (/[\u0600-\u06FF]/.test(text)) return "ur";
  const t = text.toLowerCase();
  // Roman Urdu markers
  const romanWords = [
    "mujhe", "mujhy", "chahiye", "chahye", "dikhao", "dikhaen", "batao", "bataen",
    "kia", "kya", "hai", "hain", "ka", "ki", "ke", "ko", "mein", "me", "se",
    "acha", "achha", "acha", "sasta", "sasty", "mehnga", "kitne", "kitna",
    "kahan", "kab", "kaise", "acha", "wala", "wali", "wale", "lye", "liye",
  ];
  const hits = romanWords.filter((w) => t.includes(w)).length;
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

const GREETINGS = ["hello", "hi", "hey", "salam", "aoa", "assalam", "hey zozu", "hey zuzu", "adab", "salaam", "السلام"];
const DEAL_WORDS = ["deal", "deals", "discount", "sale", "offer", "offers", "sasta", "sasty", "off", "promo", "آفر", "ڈیل", "رعایت"];
const DELIVERY_WORDS = ["delivery", "shipping", "parcel", "ship", "deliver", "pahunchega", "pahonchega", "kab aayega", "kitne din", "ڈیلیوری"];
const RETURN_WORDS = ["return", "refund", "wapasi", "wapas", "exchange", "واپسی"];
const POINTS_WORDS = ["zuzu", "points", "coins", "coin", "reward", "earn", "tap", "pooints", "کوئنز", "پوائنٹس"];
const PAYMENT_WORDS = ["payment", "pay", "card", "cash", "cod", "paisa", "pese", "price", "kimat", "قیمت", "ادائیگی"];
const ORDER_WORDS = ["order", "track", "kahan hai", "status", "meri order", "mera order", "آرڈر"];
const GIFT_WORDS = ["gift", "tohfa", "tuhfa", "present", "birthday", "gift", "تحفہ"];
const BEST_WORDS = ["best", "top", "popular", "achha", "acha", "behtreen", "recommend", "suggest", "bestseller", "بہترین"];
const THANKS_WORDS = ["thanks", "thank", "shukriya", "shukria", "شکریہ"];
const BYE_WORDS = ["bye", "allah hafiz", "khuda hafiz", "alvida", "goodbye", "اللہ حافظ"];

function hasAny(text: string, words: string[]): boolean {
  const t = text.toLowerCase();
  return words.some((w) => t.includes(w.toLowerCase()));
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

async function searchProducts(query: string, maxPrice: number | null, dealsOnly: boolean): Promise<ProductCard[]> {
  // Extract meaningful keywords (remove common words)
  const stopWords = new Set([
    "mujhe", "mujhy", "chahiye", "chahye", "dikhao", "dikhaen", "batao", "show", "me",
    "find", "search", "want", "need", "ko", "ka", "ki", "ke", "se", "mein", "the",
    "a", "an", "for", "kya", "kia", "hai", "hain", "aur", "or", "acha", "achha",
    "sasta", "sasty", "dikha", "do", "de", "please", "plz", "zara", "koi", "under",
    "below", "less", "than", "wala", "wali", "wale", "lye", "liye",
  ]);
  const keywords = query
    .toLowerCase()
    .replace(/,/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w) && !/^\d+$/.test(w));

  const where: Record<string, unknown> = { active: true };
  if (dealsOnly) where.deal = true;
  if (maxPrice !== null) where.priceCents = { lte: maxPrice * 100 };

  if (keywords.length > 0) {
    (where as Record<string, unknown>).OR = keywords.flatMap((kw) => [
      { name: { contains: kw, mode: "insensitive" } },
      { description: { contains: kw, mode: "insensitive" } },
      { shortDesc: { contains: kw, mode: "insensitive" } },
      { brand: { contains: kw, mode: "insensitive" } },
      { category: { name: { contains: kw, mode: "insensitive" } } },
    ]);
  }

  const products = await db.product.findMany({
    where: where as never,
    select: {
      id: true, name: true, slug: true, priceCents: true,
      originalPriceCents: true, images: true, rating: true,
    },
    orderBy: [{ featured: "desc" }, { rating: "desc" }],
    take: 4,
  });

  return products.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    price: p.priceCents / 100,
    originalPrice: p.originalPriceCents ? p.originalPriceCents / 100 : null,
    image: Array.isArray(p.images) && p.images.length > 0 ? String(p.images[0]) : null,
    rating: p.rating,
  }));
}

async function getSuggestions(excludeIds: string[]): Promise<ProductCard[]> {
  const products = await db.product.findMany({
    where: { active: true, id: { notIn: excludeIds }, OR: [{ deal: true }, { featured: true }] },
    select: {
      id: true, name: true, slug: true, priceCents: true,
      originalPriceCents: true, images: true, rating: true,
    },
    orderBy: { rating: "desc" },
    take: 2,
  });
  return products.map((p) => ({
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

    if (hasAny(message, GREETINGS) && message.trim().length < 30) {
      text = T.greeting[lang];
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
      text = T.order[lang];
    } else {
      // Product search / deals / recommendations
      const wantsDeals = hasAny(message, DEAL_WORDS);
      const wantsGift = hasAny(message, GIFT_WORDS);
      const wantsBest = hasAny(message, BEST_WORDS);

      products = await searchProducts(message, maxPrice, wantsDeals);

      // Gift → pick highly-rated products as gift ideas
      if (wantsGift && products.length === 0) {
        products = await getSuggestions([]);
        text = lang === "en" ? "🎁 Perfect gift ideas for you!" : lang === "roman" ? "🎁 Apke liye perfect gift ideas!" : "🎁 آپ کے لیے بہترین تحفے کے آئیڈیاز!";
      } else if (products.length > 0) {
        text = wantsDeals
          ? T.deals[lang]
          : wantsBest
            ? (lang === "en" ? "⭐ Our top-rated picks for you!" : lang === "roman" ? "⭐ Apke liye sab se top-rated!" : "⭐ آپ کے لیے سب سے ٹاپ ریٹڈ!")
            : T.foundProducts[lang](products.length);
        // Add smart suggestions
        suggestions = await getSuggestions(products.map((p) => p.id));
      } else {
        text = T.noProducts[lang];
        suggestions = await getSuggestions([]);
      }
    }

    return NextResponse.json({ ok: true, text, products, suggestions, lang });
  } catch (e) {
    console.error("ai-assistant error", e);
    return NextResponse.json({ ok: false, error: "Something went wrong" }, { status: 500 });
  }
}
