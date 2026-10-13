/** Simple EN/UR i18n for the ZUVO storefront. Urdu translations are AI-crafted. */

export type Locale = "en" | "ur";

const en = {
  "nav.home": "Home",
  "nav.categories": "Categories",
  "nav.deals": "Deals",
  "nav.aiChat": "AI Chat",
  "search.placeholder": "Search products…",
  "hero.badge": "🔥 Mega Sale — up to 50% OFF",
  "hero.title": "Discover More. Shop Smarter.",
  "hero.subtitle": "Thousands of products, unbeatable prices, delivered to your door.",
  "hero.cta": "Shop Now",
  "hero.cta2": "Today's Deals",
  "sec.featured": "Featured Products",
  "sec.featuredSub": "Hand-picked favorites",
  "sec.deals": "Today's Deals",
  "sec.dealsSub": "Limited-time discounts",
  "sec.new": "New Arrivals",
  "sec.newSub": "The latest additions to ZUVO",
  "sec.forYou": "✨ For You",
  "sec.forYouSub": "AI picks based on what you've been browsing",
  "sec.recent": "👁️ Recently Viewed",
  "sec.recentSub": "Pick up where you left off",
  "sec.categories": "Shop by Category",
  "sec.categoriesSub": "Find exactly what you need",
  "common.viewAll": "View all →",
  "common.addToCart": "Add to Cart",
  "common.buyNow": "Buy Now",
  "cart.title": "Your Cart",
  "cart.empty": "Your cart is empty",
  "cart.checkout": "Checkout",
  "footer.tagline": "Discover More. Shop Smarter.",
  "footer.shop": "Shop",
  "footer.help": "Help",
  "footer.about": "About ZUVO",
  "footer.rights": "All rights reserved.",
  "footer.builtBy": "Built by Haider Malik",
};

export type DictKey = keyof typeof en;

const ur: Record<DictKey, string> = {
  "nav.home": "ہوم",
  "nav.categories": "کیٹیگریز",
  "nav.deals": "ڈیلز",
  "nav.aiChat": "اے آئی چیٹ",
  "search.placeholder": "پروڈکٹس تلاش کریں…",
  "hero.badge": "🔥 میگا سیل — 50% تک رعایت",
  "hero.title": "زیادہ دریافت کریں۔ ہوشیاری سے خریدیں۔",
  "hero.subtitle": "ہزاروں پروڈکٹس، بہترین قیمتیں، آپ کے دروازے تک ڈیلیوری۔",
  "hero.cta": "ابھی خریدیں",
  "hero.cta2": "آج کی ڈیلز",
  "sec.featured": "نمایاں پروڈکٹس",
  "sec.featuredSub": "خاص طور پر منتخب کردہ",
  "sec.deals": "آج کی ڈیلز",
  "sec.dealsSub": "محدود وقت کی رعایتیں",
  "sec.new": "نئی آمد",
  "sec.newSub": "زوو میں تازہ ترین اضافے",
  "sec.forYou": "✨ آپ کے لیے",
  "sec.forYouSub": "آپ کی دلچسپی کے مطابق اے آئی کی منتخب کردہ",
  "sec.recent": "👁️ حال ہی میں دیکھے گئے",
  "sec.recentSub": "جہاں چھوڑا تھا وہیں سے شروع کریں",
  "sec.categories": "کیٹیگری کے حساب سے خریدیں",
  "sec.categoriesSub": "بالکل وہی ڈھونڈیں جو چاہیے",
  "common.viewAll": "سب دیکھیں →",
  "common.addToCart": "کارٹ میں ڈالیں",
  "common.buyNow": "ابھی خریدیں",
  "cart.title": "آپ کا کارٹ",
  "cart.empty": "آپ کا کارٹ خالی ہے",
  "cart.checkout": "چیک آؤٹ",
  "footer.tagline": "زیادہ دریافت کریں۔ ہوشیاری سے خریدیں۔",
  "footer.shop": "خریداری",
  "footer.help": "مدد",
  "footer.about": "زوو کے بارے میں",
  "footer.rights": "جملہ حقوق محفوظ ہیں۔",
  "footer.builtBy": "Haider Malik کی تخلیق",
};

const dicts: Record<Locale, Record<DictKey, string>> = { en, ur };

export function t(locale: Locale, key: DictKey): string {
  return dicts[locale][key] ?? dicts.en[key] ?? key;
}

export const LOCALE_COOKIE = "zuvo-locale";

export function parseLocale(v: string | undefined | null): Locale {
  return v === "ur" ? "ur" : "en";
}

/** Read the locale from cookies (server components). */
export async function getLocale(): Promise<Locale> {
  const { cookies } = await import("next/headers");
  const jar = await cookies();
  return parseLocale(jar.get(LOCALE_COOKIE)?.value);
}
