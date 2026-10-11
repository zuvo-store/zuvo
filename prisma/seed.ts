/**
 * ZUVO demo seed.
 *
 * Generates original placeholder SVG art into public/p/, then seeds:
 * 8 categories, 48 products (with variants + reviews), an admin user,
 * a demo customer, a $20 signup reward campaign, the WELCOME10 promotion,
 * site settings and a few referral visits.
 *
 * Re-runnable: wipes existing demo data first (FK-safe delete order).
 *
 * Run:  npx tsx prisma/seed.ts
 *   or  npm run db:seed   (prisma db seed)
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";
import { db } from "../lib/db";

const HERE = dirname(fileURLToPath(import.meta.url));
const P_DIR = join(HERE, "..", "public", "p");
mkdirSync(P_DIR, { recursive: true });

// ------------------------------------------------------------------ SVG art
function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/**
 * Tasteful original placeholder: soft diagonal gradient between two hues,
 * translucent circle pattern, big bold initials at 45% opacity, and a small
 * label bar at the bottom. No copied art, no external references.
 */
function makeSvg(hue: number, label: string, sub?: string): string {
  const h1 = ((hue % 360) + 360) % 360;
  const h2 = (h1 + 45) % 360;
  const initials = label
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800" role="img" aria-label="${escapeXml(label)}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="hsl(${h1},68%,62%)"/>
      <stop offset="1" stop-color="hsl(${h2},70%,44%)"/>
    </linearGradient>
  </defs>
  <rect width="800" height="800" fill="url(#g)"/>
  <circle cx="110" cy="130" r="185" fill="#ffffff" opacity="0.12"/>
  <circle cx="705" cy="630" r="225" fill="#ffffff" opacity="0.10"/>
  <circle cx="650" cy="110" r="95" fill="#000000" opacity="0.08"/>
  <circle cx="140" cy="690" r="125" fill="#000000" opacity="0.06"/>
  <circle cx="400" cy="400" r="300" fill="none" stroke="#ffffff" stroke-width="2" opacity="0.15"/>
  <text x="400" y="445" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="250" font-weight="bold" fill="#ffffff" opacity="0.45">${escapeXml(initials)}</text>
  <rect x="0" y="688" width="800" height="112" fill="#000000" opacity="0.28"/>
  <text x="400" y="740" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="40" font-weight="bold" fill="#ffffff">${escapeXml(label.length > 34 ? label.slice(0, 34) + "…" : label)}</text>
  ${sub ? `<text x="400" y="776" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="26" fill="#ffffff" opacity="0.85">${escapeXml(sub)}</text>` : ""}
</svg>`;
}

function writeArt(file: string, hue: number, label: string, sub?: string): string {
  writeFileSync(join(P_DIR, file), makeSvg(hue, label, sub), "utf8");
  return `/p/${file}`;
}

// ------------------------------------------------------------------ data types
type VariantSeed = {
  name: string;
  value: string;
  priceDeltaCents?: number;
  stock: number;
  sku: string;
};

type ProductSeed = {
  slug: string;
  name: string;
  brand: string;
  shortDesc: string;
  description: string;
  priceCents: number;
  originalPriceCents?: number;
  deal?: boolean;
  featured?: boolean;
  stock: number;
  sku: string;
  images: number;
  attributes: [string, string][];
  variants?: VariantSeed[];
  withReviews?: boolean;
};

type CategorySeed = {
  slug: string;
  name: string;
  description: string;
  sortOrder: number;
  hue: number;
  products: ProductSeed[];
};

const CATEGORIES: CategorySeed[] = [
  {
    slug: "electronics",
    name: "Electronics",
    description: "Audio, charging, smart home and camera gear built for everyday life.",
    sortOrder: 1,
    hue: 210,
    products: [
      {
        slug: "voltcore-aurabuds",
        name: "VoltCore AuraBuds Wireless Earbuds",
        brand: "VoltCore",
        shortDesc: "Hybrid ANC earbuds with 36-hour total battery life.",
        description:
          "The AuraBuds pair punchy 11mm drivers with hybrid active noise cancellation, so commutes and open offices fade into the background. Four microphones keep calls crisp, and the pocketable case adds fast top-ups — ten minutes gives you four hours of playback.",
        priceCents: 5999,
        originalPriceCents: 8999,
        deal: true,
        featured: true,
        stock: 0,
        sku: "ZV-EL-001",
        images: 3,
        attributes: [["Battery life", "36 hours with case"], ["Bluetooth", "5.4"], ["Noise control", "Hybrid ANC"], ["Water resistance", "IPX5"]],
        variants: [
          { name: "Color", value: "Onyx Black", stock: 45, sku: "ZV-EL-001-BLK" },
          { name: "Color", value: "Arctic White", stock: 50, sku: "ZV-EL-001-WHT" },
          { name: "Color", value: "Pacific Blue", stock: 45, sku: "ZV-EL-001-BLU" },
        ],
        withReviews: true,
      },
      {
        slug: "nexapeak-gan-charger",
        name: "NexaPeak 65W GaN Fast Charger",
        brand: "NexaPeak",
        shortDesc: "Pocket-size 65W GaN charger with three ports.",
        description:
          "Gallium-nitride tech squeezes 65 watts into a charger smaller than a deck of cards. Two USB-C ports plus one USB-A handle a laptop, phone and earbuds at once, with smart power splitting so nothing overheats.",
        priceCents: 3499,
        stock: 0,
        sku: "ZV-EL-002",
        images: 2,
        attributes: [["Output", "65W GaN"], ["Ports", "2x USB-C, 1x USB-A"], ["Input", "100-240V"], ["Dimensions", "48 x 48 x 28 mm"]],
        variants: [
          { name: "Color", value: "White", stock: 110, sku: "ZV-EL-002-WHT" },
          { name: "Color", value: "Black", stock: 90, sku: "ZV-EL-002-BLK" },
        ],
      },
      {
        slug: "lumatech-halo-lamp",
        name: "LumaTech Halo Smart Desk Lamp",
        brand: "LumaTech",
        shortDesc: "App-controlled desk lamp with warm-to-cool light.",
        description:
          "The Halo lamp washes your desk in flicker-free light from candle-warm 2700K to daylight 6000K. Tap the base for five brightness steps or fine-tune everything from the companion app, including wake-up fades and focus timers.",
        priceCents: 4999,
        originalPriceCents: 6999,
        deal: true,
        stock: 85,
        sku: "ZV-EL-003",
        images: 2,
        attributes: [["Brightness", "5 levels, 800 lm"], ["Color temperature", "2700-6000K"], ["Control", "Touch + app"], ["Power", "USB-C 12W"]],
        withReviews: true,
      },
      {
        slug: "orbitaudio-boom-mini",
        name: "OrbitAudio Boom Mini Bluetooth Speaker",
        brand: "OrbitAudio",
        shortDesc: "IPX7 waterproof speaker with 18-hour playtime.",
        description:
          "Boom Mini shrugs off pool splashes and rainstorms while a 20W driver fills the backyard with sound. Pair two for true wireless stereo, and the 18-hour battery outlasts the longest cookout.",
        priceCents: 7999,
        originalPriceCents: 9999,
        featured: true,
        stock: 0,
        sku: "ZV-EL-004",
        images: 3,
        attributes: [["Playtime", "18 hours"], ["Waterproof", "IPX7"], ["Driver", "20W full-range"], ["Pairing", "Stereo TWS"]],
        variants: [
          { name: "Color", value: "Charcoal", stock: 40, sku: "ZV-EL-004-CHR" },
          { name: "Color", value: "Sand", stock: 35, sku: "ZV-EL-004-SND" },
          { name: "Color", value: "Teal", stock: 35, sku: "ZV-EL-004-TEA" },
        ],
      },
      {
        slug: "pixelforge-trail-cam",
        name: "PixelForge Trail 4K Action Camera",
        brand: "PixelForge",
        shortDesc: "4K60 action camera with 6-axis stabilization.",
        description:
          "Strap the Trail to your helmet, handlebars or chest mount and capture buttery 4K60 footage. Six-axis gyro stabilization smooths out the roughest trails, and it is waterproof to 10 meters with no case needed.",
        priceCents: 12999,
        originalPriceCents: 16999,
        deal: true,
        stock: 60,
        sku: "ZV-EL-005",
        images: 3,
        attributes: [["Video", "4K60"], ["Stabilization", "6-axis gyro"], ["Waterproof", "10 m bare"], ["Battery", "1350 mAh"]],
      },
      {
        slug: "chargewell-20k-bank",
        name: "ChargeWell 20000mAh Power Bank",
        brand: "ChargeWell",
        shortDesc: "22.5W fast-charging power bank with LED display.",
        description:
          "A 20000mAh cell bank that refuels most phones four times over. The LED percentage display ends capacity guessing, and 22.5W output fast-charges phones, tablets and earbuds through three ports.",
        priceCents: 3999,
        stock: 0,
        sku: "ZV-EL-006",
        images: 2,
        attributes: [["Capacity", "20000 mAh"], ["Output", "22.5W"], ["Ports", "2x USB-C, 1x USB-A"], ["Display", "LED percentage"]],
        variants: [
          { name: "Color", value: "Graphite", stock: 90, sku: "ZV-EL-006-GRA" },
          { name: "Color", value: "White", stock: 85, sku: "ZV-EL-006-WHT" },
        ],
      },
    ],
  },
  {
    slug: "home-living",
    name: "Home & Living",
    description: "Cozy textiles, decor and smart touches for every room.",
    sortOrder: 2,
    hue: 30,
    products: [
      {
        slug: "cozynest-weighted-throw",
        name: "CozyNest Weighted Knit Throw",
        brand: "CozyNest",
        shortDesc: "7kg chunky-knit weighted throw for deep relaxation.",
        description:
          "Hand-loomed from chunky cotton yarn with evenly distributed glass microbeads, this 7kg throw wraps you in calm. It drapes beautifully over sofas and beds, and the removable design is fully machine washable.",
        priceCents: 6999,
        originalPriceCents: 9999,
        deal: true,
        featured: true,
        stock: 95,
        sku: "ZV-HM-001",
        images: 3,
        attributes: [["Weight", "7 kg"], ["Material", "Chunky cotton knit"], ["Size", "130 x 180 cm"], ["Care", "Machine washable"]],
        withReviews: true,
      },
      {
        slug: "hearthline-vase-trio",
        name: "HearthLine Ceramic Vase Trio",
        brand: "HearthLine",
        shortDesc: "Three matte stoneware vases in graduated heights.",
        description:
          "A sculptural trio of glazed stoneware vases in warm matte sand. At 18, 24 and 30 cm they group beautifully on consoles and shelves — with or without stems.",
        priceCents: 4299,
        stock: 70,
        sku: "ZV-HM-002",
        images: 2,
        attributes: [["Pieces", "3 vases"], ["Material", "Glazed stoneware"], ["Heights", "18 / 24 / 30 cm"], ["Finish", "Matte sand"]],
        withReviews: true,
      },
      {
        slug: "oakember-wall-shelf",
        name: "Oak & Ember Floating Wall Shelf",
        brand: "Oak & Ember",
        shortDesc: "Solid oak floating shelf with hidden brackets.",
        description:
          "Milled from solid oak and finished with natural oil, this 80cm shelf floats on hidden steel brackets rated to 15kg. Perfect for books, plants and framed prints.",
        priceCents: 5499,
        stock: 55,
        sku: "ZV-HM-003",
        images: 2,
        attributes: [["Material", "Solid oak"], ["Length", "80 cm"], ["Load", "Up to 15 kg"], ["Mounting", "Hidden bracket included"]],
      },
      {
        slug: "pureglow-aroma-diffuser",
        name: "PureGlow Ultrasonic Aroma Diffuser",
        brand: "PureGlow",
        shortDesc: "300ml diffuser with 10-hour runtime and ambient light.",
        description:
          "Whisper-quiet ultrasonic mist fills rooms up to 30 sqm for up to ten hours. Seven ambient light colors set the mood, and auto shut-off kicks in when the 300ml tank runs dry.",
        priceCents: 2999,
        originalPriceCents: 4499,
        stock: 130,
        sku: "ZV-HM-004",
        images: 2,
        attributes: [["Capacity", "300 ml"], ["Runtime", "Up to 10 hours"], ["Light", "7-color ambient"], ["Auto shut-off", "Yes"]],
      },
      {
        slug: "nestiva-linen-cushions",
        name: "Nestiva Linen Cushion Covers (Set of 4)",
        brand: "Nestiva",
        shortDesc: "Stonewashed linen covers with hidden zips.",
        description:
          "Four stonewashed European linen covers that soften with every wash. The 45cm squares fit standard inserts and close with invisible zippers for a tailored look.",
        priceCents: 3699,
        stock: 120,
        sku: "ZV-HM-005",
        images: 2,
        attributes: [["Set", "4 covers"], ["Material", "Stonewashed linen"], ["Size", "45 x 45 cm"], ["Closure", "Hidden zip"]],
      },
      {
        slug: "hearthline-bath-caddy",
        name: "HearthLine Bamboo Bath Caddy",
        brand: "HearthLine",
        shortDesc: "Extendable bamboo tray with book and wine holders.",
        description:
          "Turn any tub into a spa. This Moso bamboo caddy extends from 70 to 105cm and holds your book, tablet and a well-earned glass of wine, all sealed with a water-resistant oil finish.",
        priceCents: 2799,
        stock: 88,
        sku: "ZV-HM-006",
        images: 1,
        attributes: [["Material", "Moso bamboo"], ["Extends", "70-105 cm"], ["Holders", "Book, tablet, wine glass"], ["Finish", "Water-resistant oil"]],
      },
    ],
  },
  {
    slug: "fashion",
    name: "Fashion",
    description: "Wardrobe staples and statement pieces in honest fabrics.",
    sortOrder: 3,
    hue: 340,
    products: [
      {
        slug: "urbanthread-everyday-tee",
        name: "UrbanThread Everyday Cotton Tee",
        brand: "UrbanThread",
        shortDesc: "180 GSM combed-cotton tee with a clean regular fit.",
        description:
          "The tee you will reach for daily. Cut from 180 GSM combed cotton with a reinforced collar that keeps its shape wash after wash. Pre-shrunk and garment-dyed for rich, lasting color.",
        priceCents: 2499,
        featured: true,
        stock: 0,
        sku: "ZV-FA-001",
        images: 3,
        attributes: [["Fabric", "100% combed cotton"], ["Fit", "Regular"], ["Weight", "180 GSM"], ["Care", "Machine wash"]],
        variants: [
          { name: "Size", value: "S", stock: 60, sku: "ZV-FA-001-S" },
          { name: "Size", value: "M", stock: 80, sku: "ZV-FA-001-M" },
          { name: "Size", value: "L", stock: 75, sku: "ZV-FA-001-L" },
          { name: "Size", value: "XL", stock: 55, sku: "ZV-FA-001-XL" },
        ],
        withReviews: true,
      },
      {
        slug: "northloop-cloud-hoodie",
        name: "NorthLoop Cloud Fleece Hoodie",
        brand: "NorthLoop",
        shortDesc: "Brushed 320 GSM fleece hoodie, relaxed fit.",
        description:
          "Brushed on the inside for a cloud-soft feel, structured on the outside for a clean silhouette. The double-layer hood, kangaroo pocket and ribbed cuffs make this the last hoodie you will need to buy.",
        priceCents: 5499,
        originalPriceCents: 7499,
        deal: true,
        stock: 0,
        sku: "ZV-FA-002",
        images: 2,
        attributes: [["Fabric", "320 GSM brushed fleece"], ["Fit", "Relaxed"], ["Pocket", "Kangaroo"], ["Hood", "Double-layer"]],
        variants: [
          { name: "Size", value: "S", stock: 40, sku: "ZV-FA-002-S" },
          { name: "Size", value: "M", stock: 55, sku: "ZV-FA-002-M" },
          { name: "Size", value: "L", stock: 50, sku: "ZV-FA-002-L" },
          { name: "Size", value: "XL", stock: 35, sku: "ZV-FA-002-XL" },
        ],
        withReviews: true,
      },
      {
        slug: "kova-pleated-skirt",
        name: "Kova Studio Pleated Midi Skirt",
        brand: "Kova Studio",
        shortDesc: "Knife-pleat midi skirt in fluid crepe.",
        description:
          "Precision knife pleats cut from fluid crepe that moves as you do. An elasticated back waist keeps the fit comfortable from desk to dinner, and the full lining means zero cling.",
        priceCents: 4699,
        stock: 0,
        sku: "ZV-FA-003",
        images: 2,
        attributes: [["Length", "Midi, 78 cm"], ["Waist", "Elastic back"], ["Fabric", "Crepe"], ["Lining", "Full"]],
        variants: [
          { name: "Size", value: "S", stock: 30, sku: "ZV-FA-003-S" },
          { name: "Size", value: "M", stock: 40, sku: "ZV-FA-003-M" },
          { name: "Size", value: "L", stock: 38, sku: "ZV-FA-003-L" },
          { name: "Size", value: "XL", stock: 25, sku: "ZV-FA-003-XL" },
        ],
      },
      {
        slug: "fieldstone-court-sneakers",
        name: "Fieldstone Court Canvas Sneakers",
        brand: "Fieldstone",
        shortDesc: "Classic court sneakers in heavyweight canvas.",
        description:
          "A timeless court profile built from 12oz canvas on a natural rubber cupsole. Cushioned insoles and padded collars keep them comfortable for all-day wear, and they age beautifully.",
        priceCents: 6499,
        originalPriceCents: 7999,
        featured: true,
        stock: 0,
        sku: "ZV-FA-004",
        images: 3,
        attributes: [["Upper", "12oz canvas"], ["Sole", "Natural rubber"], ["Insole", "Cushioned"], ["Closure", "Lace-up"]],
        variants: [
          { name: "Size", value: "S", stock: 35, sku: "ZV-FA-004-S" },
          { name: "Size", value: "M", stock: 50, sku: "ZV-FA-004-M" },
          { name: "Size", value: "L", stock: 48, sku: "ZV-FA-004-L" },
          { name: "Size", value: "XL", stock: 30, sku: "ZV-FA-004-XL" },
        ],
      },
      {
        slug: "urbanthread-denim-jacket",
        name: "UrbanThread Vintage Denim Jacket",
        brand: "UrbanThread",
        shortDesc: "13oz Japanese denim trucker in a vintage wash.",
        description:
          "Cut from 13oz Japanese denim and stone-washed for a perfectly broken-in feel from day one. Metal shank buttons, double-needle stitching and a classic trucker block that layers over everything.",
        priceCents: 7999,
        originalPriceCents: 9999,
        deal: true,
        stock: 0,
        sku: "ZV-FA-005",
        images: 2,
        attributes: [["Denim", "13oz Japanese"], ["Wash", "Vintage stone"], ["Fit", "Trucker"], ["Buttons", "Metal shank"]],
        variants: [
          { name: "Size", value: "S", stock: 25, sku: "ZV-FA-005-S" },
          { name: "Size", value: "M", stock: 35, sku: "ZV-FA-005-M" },
          { name: "Size", value: "L", stock: 32, sku: "ZV-FA-005-L" },
          { name: "Size", value: "XL", stock: 20, sku: "ZV-FA-005-XL" },
        ],
      },
      {
        slug: "northloop-ribbed-beanie",
        name: "NorthLoop Ribbed Knit Beanie",
        brand: "NorthLoop",
        shortDesc: "Chunky-rib beanie in a warm acrylic-wool blend.",
        description:
          "A chunky rib knit with a deep folded cuff that actually stays put. The acrylic-wool blend is warm without the itch, in a palette of easy neutrals.",
        priceCents: 1699,
        stock: 0,
        sku: "ZV-FA-006",
        images: 1,
        attributes: [["Knit", "Chunky rib"], ["Material", "Acrylic-wool blend"], ["Cuff", "Folded"], ["Care", "Hand wash"]],
        variants: [
          { name: "Size", value: "S", stock: 70, sku: "ZV-FA-006-S" },
          { name: "Size", value: "M", stock: 90, sku: "ZV-FA-006-M" },
          { name: "Size", value: "L", stock: 85, sku: "ZV-FA-006-L" },
          { name: "Size", value: "XL", stock: 60, sku: "ZV-FA-006-XL" },
        ],
      },
    ],
  },
  {
    slug: "beauty",
    name: "Beauty",
    description: "Skincare, haircare and color with clean ingredient lists.",
    sortOrder: 4,
    hue: 300,
    products: [
      {
        slug: "glowmira-vitamin-c-serum",
        name: "GlowMira Vitamin C Brightening Serum",
        brand: "GlowMira",
        shortDesc: "15% vitamin C serum for visibly brighter skin.",
        description:
          "A stabilized 15% ethylated vitamin C serum that targets dark spots and dullness without the sting. Layer it under moisturizer morning and night; most users see a visible glow in two weeks.",
        priceCents: 2999,
        originalPriceCents: 3999,
        featured: true,
        stock: 150,
        sku: "ZV-BT-001",
        images: 3,
        attributes: [["Volume", "30 ml"], ["Key ingredient", "15% ethylated vitamin C"], ["Skin type", "All"], ["Cruelty-free", "Yes"]],
        withReviews: true,
      },
      {
        slug: "velvetdew-lipstick-wardrobe",
        name: "Velvet Dew Matte Lipstick Wardrobe",
        brand: "Velvet Dew",
        shortDesc: "Four velvet-matte lipsticks in wearable shades.",
        description:
          "Rosewood, Terracotta, Berry and Nude — four full-size velvet-matte lipsticks enriched with vitamin E. One swipe gives opaque, non-drying color that lasts through coffee and beyond.",
        priceCents: 2299,
        originalPriceCents: 3299,
        stock: 0,
        sku: "ZV-BT-002",
        images: 2,
        attributes: [["Finish", "Velvet matte"], ["Shades", "4 included"], ["Formula", "Vitamin E enriched"], ["Wear", "Up to 8 hours"]],
        variants: [
          { name: "Shade", value: "Rosewood", stock: 40, sku: "ZV-BT-002-RSW" },
          { name: "Shade", value: "Terracotta", stock: 40, sku: "ZV-BT-002-TER" },
          { name: "Shade", value: "Berry", stock: 40, sku: "ZV-BT-002-BER" },
          { name: "Shade", value: "Nude", stock: 40, sku: "ZV-BT-002-NUD" },
        ],
        withReviews: true,
      },
      {
        slug: "botanica-pink-clay-mask",
        name: "Botanica Pink Clay Detox Mask",
        brand: "Botanica",
        shortDesc: "French pink clay mask for clear, calm skin.",
        description:
          "French pink clay draws out impurities while chamomile keeps skin calm — no tight, crackly feeling. Ten minutes twice a week for visibly clearer pores.",
        priceCents: 1899,
        stock: 110,
        sku: "ZV-BT-003",
        images: 2,
        attributes: [["Volume", "100 ml"], ["Key ingredient", "French pink clay"], ["Use", "2x weekly"], ["Skin type", "Normal to oily"]],
      },
      {
        slug: "silkroot-argan-oil",
        name: "SilkRoot Pure Argan Hair Oil",
        brand: "SilkRoot",
        shortDesc: "Cold-pressed Moroccan argan oil for silky hair.",
        description:
          "A few drops of cold-pressed Moroccan argan oil tames frizz, seals split ends and adds glass-like shine — with zero silicones and zero grease.",
        priceCents: 2499,
        originalPriceCents: 3499,
        stock: 95,
        sku: "ZV-BT-004",
        images: 2,
        attributes: [["Volume", "100 ml"], ["Origin", "Cold-pressed Moroccan"], ["Use", "Hair + split ends"], ["Silicone-free", "Yes"]],
      },
      {
        slug: "glowmira-hydra-moisturizer",
        name: "GlowMira Hydra Gel Moisturizer",
        brand: "GlowMira",
        shortDesc: "Oil-free hyaluronic gel for weightless hydration.",
        description:
          "Five weights of hyaluronic acid in a featherlight gel that floods skin with moisture and dries down matte. Perfect under makeup and for oily-to-combination skin.",
        priceCents: 2699,
        stock: 120,
        sku: "ZV-BT-005",
        images: 2,
        attributes: [["Volume", "50 ml"], ["Key ingredient", "Hyaluronic acid"], ["Texture", "Oil-free gel"], ["Skin type", "All"]],
      },
      {
        slug: "velvetdew-blush-duo",
        name: "Velvet Dew Baked Blush Duo",
        brand: "Velvet Dew",
        shortDesc: "Talc-free baked blush in three radiant shades.",
        description:
          "Slow-baked on terracotta tiles for a satin finish that melts into skin. Each compact pairs a blush with a lit-from-within highlighter in Peach Glow, Rose Bloom or Golden Hour.",
        priceCents: 1999,
        stock: 0,
        sku: "ZV-BT-006",
        images: 2,
        attributes: [["Finish", "Satin baked"], ["Shades", "2 per compact"], ["Formula", "Talc-free"], ["Wear", "Up to 10 hours"]],
        variants: [
          { name: "Shade", value: "Peach Glow", stock: 45, sku: "ZV-BT-006-PCH" },
          { name: "Shade", value: "Rose Bloom", stock: 45, sku: "ZV-BT-006-RSE" },
          { name: "Shade", value: "Golden Hour", stock: 40, sku: "ZV-BT-006-GLD" },
        ],
      },
    ],
  },
  {
    slug: "sports-outdoors",
    name: "Sports & Outdoors",
    description: "Training essentials and trail-ready gear.",
    sortOrder: 5,
    hue: 150,
    products: [
      {
        slug: "trailpeak-trail-bottle",
        name: "TrailPeak Insulated Trail Bottle",
        brand: "TrailPeak",
        shortDesc: "Double-wall steel bottle, 24h cold / 12h hot.",
        description:
          "Double-wall vacuum insulation keeps water ice-cold for 24 hours or coffee hot for 12. The leakproof straw cap drinks easily on the move, and the powder-coat finish grips even with sweaty hands.",
        priceCents: 2799,
        originalPriceCents: 3499,
        featured: true,
        stock: 0,
        sku: "ZV-SP-001",
        images: 3,
        attributes: [["Insulation", "24h cold / 12h hot"], ["Material", "18/8 steel"], ["Cap", "Leakproof straw"], ["Weight", "480 g"]],
        variants: [
          { name: "Size", value: "750 ml", stock: 60, sku: "ZV-SP-001-750" },
          { name: "Size", value: "1 L", priceDeltaCents: 400, stock: 70, sku: "ZV-SP-001-1L" },
        ],
        withReviews: true,
      },
      {
        slug: "apexform-pro-yoga-mat",
        name: "ApexForm Pro Yoga Mat 6mm",
        brand: "ApexForm",
        shortDesc: "Non-slip 6mm TPE mat with alignment lines.",
        description:
          "Six millimeters of joint-friendly cushioning with a dual-texture non-slip surface. Laser-etched alignment lines keep your form honest, and it wipes clean in seconds. Choose Standard or Extra Long.",
        priceCents: 4499,
        originalPriceCents: 5999,
        deal: true,
        stock: 0,
        sku: "ZV-SP-002",
        images: 2,
        attributes: [["Thickness", "6 mm"], ["Material", "TPE non-slip"], ["Length", "183 cm / XL 200 cm"], ["Includes", "Carry strap"]],
        variants: [
          { name: "Size", value: "Standard", stock: 55, sku: "ZV-SP-002-STD" },
          { name: "Size", value: "Extra Long", priceDeltaCents: 1000, stock: 40, sku: "ZV-SP-002-XL" },
        ],
        withReviews: true,
      },
      {
        slug: "hydroflow-camp-cups",
        name: "HydroFlow Collapsible Camp Cups (4pc)",
        brand: "HydroFlow",
        shortDesc: "Food-grade silicone cups that pack flat.",
        description:
          "Four 350ml cups in food-grade silicone that collapse flat for the trail and pop open for camp coffee. Heat-resistant to 230C and dishwasher safe.",
        priceCents: 2199,
        stock: 140,
        sku: "ZV-SP-003",
        images: 2,
        attributes: [["Set", "4 cups"], ["Capacity", "350 ml each"], ["Material", "Food-grade silicone"], ["Packs", "Flat"]],
      },
      {
        slug: "summit-resistance-bands",
        name: "Summit & Trail Resistance Band Set",
        brand: "Summit & Trail",
        shortDesc: "Five stackable bands from 10 to 50 lb.",
        description:
          "Five natural-latex bands from 10 to 50 lb stack for over 100 lb of combined resistance. Snap on the cushioned handles or door anchor for a full gym that fits in the included pouch.",
        priceCents: 3299,
        originalPriceCents: 4599,
        deal: true,
        stock: 105,
        sku: "ZV-SP-004",
        images: 2,
        attributes: [["Set", "5 bands (10-50 lb)"], ["Material", "Natural latex"], ["Includes", "Handles + door anchor"], ["Bag", "Carry pouch"]],
      },
      {
        slug: "apexform-speed-rope",
        name: "ApexForm Speed Jump Rope",
        brand: "ApexForm",
        shortDesc: "Ball-bearing speed rope with adjustable cable.",
        description:
          "Dual ball bearings spin the adjustable 3m cable fast and tangle-free. Knurled anti-slip handles stay put through double-unders and long conditioning sets.",
        priceCents: 1499,
        stock: 160,
        sku: "ZV-SP-005",
        images: 1,
        attributes: [["Bearings", "Dual ball-bearing"], ["Cable", "Adjustable 3 m"], ["Handles", "Anti-slip"], ["Use", "Cross-training"]],
      },
      {
        slug: "trailpeak-1000-headlamp",
        name: "TrailPeak 1000-Lumen Headlamp",
        brand: "TrailPeak",
        shortDesc: "USB-C rechargeable headlamp, IPX6 waterproof.",
        description:
          "A true 1000-lumen beam with five modes including red night-vision. The USB-C battery runs 8 hours on medium, and IPX6 sealing laughs at downpours.",
        priceCents: 2399,
        stock: 90,
        sku: "ZV-SP-006",
        images: 2,
        attributes: [["Brightness", "1000 lm"], ["Modes", "5 incl. red"], ["Battery", "USB-C rechargeable"], ["Waterproof", "IPX6"]],
      },
    ],
  },
  {
    slug: "accessories",
    name: "Accessories",
    description: "Watches, bags, jewelry and finishing touches.",
    sortOrder: 6,
    hue: 45,
    products: [
      {
        slug: "strandstone-minimal-watch",
        name: "Strand & Stone Minimalist Watch",
        brand: "Strand & Stone",
        shortDesc: "40mm brushed-steel watch with Italian leather strap.",
        description:
          "A study in restraint: a 40mm brushed-steel case, a clean dial with baton markers, and a vegetable-tanned Italian leather strap. Japanese quartz keeps it accurate to seconds per month.",
        priceCents: 8999,
        originalPriceCents: 12999,
        deal: true,
        featured: true,
        stock: 65,
        sku: "ZV-AC-001",
        images: 3,
        attributes: [["Case", "40 mm brushed steel"], ["Movement", "Japanese quartz"], ["Strap", "Italian leather"], ["Water resistance", "5 ATM"]],
        withReviews: true,
      },
      {
        slug: "carryall-canvas-tote",
        name: "CarryAll Everyday Canvas Tote",
        brand: "CarryAll",
        shortDesc: "18L waxed-canvas tote with interior pockets.",
        description:
          "Waxed 16oz canvas that shrugs off drizzle and develops a rich patina. An 18L main compartment swallows laptops and groceries, with a zipped interior pocket for valuables.",
        priceCents: 3499,
        originalPriceCents: 4499,
        stock: 115,
        sku: "ZV-AC-002",
        images: 2,
        attributes: [["Material", "16oz waxed canvas"], ["Volume", "18 L"], ["Pockets", "Interior zip + slip"], ["Straps", "Cotton webbing"]],
        withReviews: true,
      },
      {
        slug: "timemark-slim-wallet",
        name: "TimeMark Slim Leather Wallet",
        brand: "TimeMark",
        shortDesc: "Full-grain leather bifold with RFID shielding.",
        description:
          "Eight cards, folded bills and nothing else — full-grain leather that molds to your pocket. An RFID-blocking liner keeps skimmers out of your accounts.",
        priceCents: 4499,
        stock: 80,
        sku: "ZV-AC-003",
        images: 2,
        attributes: [["Material", "Full-grain leather"], ["Cards", "8 + cash"], ["RFID", "Blocking lined"], ["Size", "10 x 8 cm"]],
      },
      {
        slug: "loomco-silk-scarf",
        name: "Loom & Co. Mulberry Silk Scarf",
        brand: "Loom & Co.",
        shortDesc: "90cm mulberry silk scarf, hand-rolled edges.",
        description:
          "Woven from 100% mulberry silk and printed with an original studio design, finished with hand-rolled edges. Wear it knotted, draped or as a headscarf.",
        priceCents: 2899,
        originalPriceCents: 3999,
        stock: 75,
        sku: "ZV-AC-004",
        images: 2,
        attributes: [["Material", "100% mulberry silk"], ["Size", "90 x 90 cm"], ["Edges", "Hand-rolled"], ["Print", "Original studio design"]],
      },
      {
        slug: "strandstone-sculpted-hoops",
        name: "Strand & Stone Sculpted Hoops",
        brand: "Strand & Stone",
        shortDesc: "14k gold-plated sculpted hoops, nickel-free.",
        description:
          "Organically sculpted 25mm hoops in 14k gold plate over recycled brass. Secure hinge closures and a nickel-free finish kind to sensitive ears.",
        priceCents: 1999,
        stock: 130,
        sku: "ZV-AC-005",
        images: 1,
        attributes: [["Material", "14k gold-plated brass"], ["Diameter", "25 mm"], ["Closure", "Hinge"], ["Hypoallergenic", "Nickel-free"]],
      },
      {
        slug: "carryall-tech-organizer",
        name: "CarryAll Tech Travel Organizer",
        brand: "CarryAll",
        shortDesc: "Ballistic-nylon organizer with 12 elastic loops.",
        description:
          "Twelve elastic loops, mesh pockets and a padded tablet sleeve corral every cable and dongle. Ballistic nylon and a YKK zip survive years of overhead bins.",
        priceCents: 2699,
        stock: 95,
        sku: "ZV-AC-006",
        images: 2,
        attributes: [["Compartments", "12 elastic loops"], ["Material", "Ballistic nylon"], ["Size", "24 x 17 cm"], ["Closure", "YKK zip"]],
      },
    ],
  },
  {
    slug: "kitchen",
    name: "Kitchen",
    description: "Cookware, coffee gear and prep tools that earn their shelf space.",
    sortOrder: 7,
    hue: 90,
    products: [
      {
        slug: "terrapan-fry-pan",
        name: "TerraPan Ceramic Nonstick Fry Pan 10in",
        brand: "TerraPan",
        shortDesc: "Ceramic nonstick pan, induction-ready.",
        description:
          "A PFAS-free ceramic coating over a heavy-gauge aluminum body heats evenly with zero hot spots. The stay-cool silicone handle goes from stovetop to table, and it works on induction.",
        priceCents: 4999,
        originalPriceCents: 6999,
        deal: true,
        featured: true,
        stock: 85,
        sku: "ZV-KI-001",
        images: 3,
        attributes: [["Diameter", "26 cm"], ["Coating", "Ceramic nonstick"], ["Handle", "Stay-cool silicone"], ["Compatibility", "All hobs incl. induction"]],
        withReviews: true,
      },
      {
        slug: "brewcraft-pourover-set",
        name: "BrewCraft Pour-Over Coffee Set",
        brand: "BrewCraft",
        shortDesc: "Glass carafe, ceramic dripper and 40 filters.",
        description:
          "Everything for cafe-level pour-over at home: a ceramic V60-style dripper, 600ml borosilicate carafe and 40 oxygen-bleached filters. The spiral ribs ensure an even, sweet extraction.",
        priceCents: 3999,
        stock: 70,
        sku: "ZV-KI-002",
        images: 2,
        attributes: [["Set", "Dripper, carafe 600 ml, filters"], ["Material", "Borosilicate glass"], ["Dripper", "Ceramic V60-style"], ["Filters", "40 included"]],
      },
      {
        slug: "chefline-chefs-knife",
        name: "ChefLine 8in Chef's Knife",
        brand: "ChefLine",
        shortDesc: "German-steel chef knife, 58 HRC.",
        description:
          "Forged from German 1.4116 steel hardened to 58 HRC, this 20cm chef knife holds an edge through daily prep. The pakkawood handle is balanced, grippy and beautiful.",
        priceCents: 5499,
        stock: 60,
        sku: "ZV-KI-003",
        images: 2,
        attributes: [["Blade", "German steel 1.4116"], ["Length", "20 cm"], ["Handle", "Pakkawood"], ["Hardness", "58 HRC"]],
        withReviews: true,
      },
      {
        slug: "freshseal-storage-set",
        name: "FreshSeal Glass Storage Set (12pc)",
        brand: "FreshSeal",
        shortDesc: "Six borosilicate containers with snap-lock lids.",
        description:
          "Six borosilicate glass containers with leakproof snap-lock lids that go from freezer to oven to table. Stackable, stain-proof and built to replace disposable plastic for good.",
        priceCents: 4299,
        originalPriceCents: 5999,
        deal: true,
        stock: 100,
        sku: "ZV-KI-004",
        images: 2,
        attributes: [["Pieces", "6 containers + 6 lids"], ["Material", "Borosilicate glass"], ["Lids", "Snap-lock BPA-free"], ["Safe", "Oven, microwave, freezer"]],
      },
      {
        slug: "brewcraft-french-press",
        name: "BrewCraft Insulated French Press",
        brand: "BrewCraft",
        shortDesc: "Double-wall 1L press, keeps coffee hot 2 hours.",
        description:
          "Double-wall stainless steel keeps a full liter hot for two hours without a cozy. The four-level mesh filter delivers a clean, sediment-free cup every time.",
        priceCents: 3499,
        originalPriceCents: 4499,
        stock: 78,
        sku: "ZV-KI-005",
        images: 2,
        attributes: [["Capacity", "1 L"], ["Walls", "Double-wall steel"], ["Filter", "4-level mesh"], ["Keeps hot", "2 hours"]],
      },
      {
        slug: "chefline-bamboo-boards",
        name: "ChefLine Bamboo Board Set (3pc)",
        brand: "ChefLine",
        shortDesc: "Three Moso bamboo boards in S/M/L.",
        description:
          "Three Moso bamboo boards sized for every job — paring, prep and carving. Naturally antimicrobial, knife-friendly and finished with food-safe oil.",
        priceCents: 2999,
        stock: 110,
        sku: "ZV-KI-006",
        images: 1,
        attributes: [["Set", "3 boards"], ["Material", "Moso bamboo"], ["Sizes", "S / M / L"], ["Care", "Hand wash"]],
      },
    ],
  },
  {
    slug: "toys-hobbies",
    name: "Toys & Hobbies",
    description: "Building sets, games and craft kits for curious minds.",
    sortOrder: 8,
    hue: 190,
    products: [
      {
        slug: "wonderbuild-500-blocks",
        name: "WonderBuild 500pc Creative Blocks",
        brand: "WonderBuild",
        shortDesc: "500-piece building set compatible with major brands.",
        description:
          "Five hundred precision-molded bricks in a rainbow of colors, compatible with the major building brands kids already own. Includes a sorting box and idea booklet for ages 4 and up.",
        priceCents: 4499,
        originalPriceCents: 6499,
        deal: true,
        featured: true,
        stock: 90,
        sku: "ZV-TH-001",
        images: 3,
        attributes: [["Pieces", "500"], ["Compatibility", "Major brands"], ["Ages", "4+"], ["Storage", "Sorting box included"]],
        withReviews: true,
      },
      {
        slug: "pixelplay-retro-console",
        name: "PixelPlay Retro Handheld Console",
        brand: "PixelPlay",
        shortDesc: "3.5in handheld with 400 preloaded games.",
        description:
          "A pocket arcade with a crisp 3.5in IPS screen and 400 preloaded classics. Eight hours of battery, save states, and SD expansion for your own library.",
        priceCents: 5999,
        stock: 55,
        sku: "ZV-TH-002",
        images: 2,
        attributes: [["Screen", "3.5in IPS"], ["Games", "400 preloaded"], ["Battery", "8 hours"], ["Card", "Supports SD expansion"]],
        withReviews: true,
      },
      {
        slug: "craftnest-watercolor-kit",
        name: "CraftNest Watercolor Art Kit",
        brand: "CraftNest",
        shortDesc: "48-color watercolor kit in a tin gift box.",
        description:
          "Forty-eight vivid watercolors, six brushes plus a water brush, and twelve sheets of 300 GSM paper — everything a beginner or sketcher needs, packed in a keepsake tin.",
        priceCents: 3299,
        stock: 85,
        sku: "ZV-TH-003",
        images: 2,
        attributes: [["Paints", "48 colors"], ["Brushes", "6 + water brush"], ["Paper", "12 sheets 300 GSM"], ["Case", "Tin gift box"]],
      },
      {
        slug: "mindmeld-jigsaw-1000",
        name: "MindMeld 1000pc Jigsaw Puzzle",
        brand: "MindMeld",
        shortDesc: "Museum-grade 1000pc puzzle, low-dust cut.",
        description:
          "A thousand ribbon-cut pieces printed with museum-grade inks on low-dust board. The finished 68x48cm artwork is frame-worthy — if you can bear to break it up.",
        priceCents: 2499,
        originalPriceCents: 3499,
        stock: 120,
        sku: "ZV-TH-004",
        images: 2,
        attributes: [["Pieces", "1000"], ["Size", "68 x 48 cm"], ["Print", "Museum-grade"], ["Cut", "Ribbon cut, low dust"]],
      },
      {
        slug: "wonderbuild-rc-stunt-car",
        name: "WonderBuild RC Stunt Car",
        brand: "WonderBuild",
        shortDesc: "2.4GHz stunt car with 360 flips, 40-min runtime.",
        description:
          "Double-sided stunt car that drives upside-down and flips 360 degrees at the push of a button. Two batteries give 40 minutes of runtime on the 50m 2.4GHz remote.",
        priceCents: 4999,
        stock: 65,
        sku: "ZV-TH-005",
        images: 2,
        attributes: [["Control", "2.4 GHz, 50 m"], ["Runtime", "40 min (2 batteries)"], ["Feature", "360-degree flips"], ["Speed", "15 km/h"]],
      },
      {
        slug: "craftnest-candle-kit",
        name: "CraftNest DIY Candle Making Kit",
        brand: "CraftNest",
        shortDesc: "Make 8 soy candles with 4 fragrance oils.",
        description:
          "Pour eight natural soy candles with four fragrance oils, cotton wicks, tins and a thermometer. A perfect rainy-weekend project or handmade-gift factory.",
        priceCents: 2799,
        originalPriceCents: 3499,
        stock: 95,
        sku: "ZV-TH-006",
        images: 1,
        attributes: [["Makes", "8 candles"], ["Wax", "Natural soy"], ["Scents", "4 fragrance oils"], ["Includes", "Tins, wicks, thermometer"]],
      },
    ],
  },
];

// ------------------------------------------------------------------ reviews
type ReviewSeed = { authorName: string; rating: number; title: string; body: string };

const REVIEW_POOL: ReviewSeed[] = [
  { authorName: "Maya R.", rating: 5, title: "Exceeded expectations", body: "Honestly better than I expected for the price. Build quality feels premium and it arrived earlier than estimated." },
  { authorName: "Daniel K.", rating: 5, title: "Daily driver now", body: "I use this every single day and it has not missed a beat. Setup took two minutes." },
  { authorName: "Priya S.", rating: 4, title: "Great, minor quibbles", body: "Does everything promised. Took one star off because the manual could be clearer, but support answered my question within an hour." },
  { authorName: "Tom H.", rating: 5, title: "Bought a second one", body: "Liked the first so much I bought another as a gift. Packaging was excellent too." },
  { authorName: "Aisha M.", rating: 4, title: "Solid value", body: "For this price it is hard to beat. Works exactly as described and feels durable." },
  { authorName: "Leo F.", rating: 5, title: "Worth every cent", body: "I compared a lot of options before choosing this. Zero regrets — performance is fantastic." },
  { authorName: "Nina P.", rating: 5, title: "My new favorite", body: "Beautiful design, thoughtful details, and it just works. Highly recommended." },
  { authorName: "Omar J.", rating: 4, title: "Very good overall", body: "Quality is clearly a step above the cheaper alternatives I tried. Shipping was fast." },
  { authorName: "Sara L.", rating: 5, title: "Perfect gift", body: "Bought this for my brother and he has not stopped talking about it. Great purchase." },
  { authorName: "Chris B.", rating: 3, title: "Good, not perfect", body: "It works well for the basics. A couple of small annoyances, but nothing deal-breaking at this price." },
  { authorName: "Elena V.", rating: 5, title: "Five stars, no notes", body: "From unboxing to daily use, everything feels considered. This is how products should be made." },
  { authorName: "Raj T.", rating: 4, title: "Does the job well", body: "Reliable and well built. I would buy from this brand again." },
];

// ------------------------------------------------------------------ seed
async function main() {
  console.log("Seeding ZUVO demo data…");

  // --- wipe (FK-safe order) ---
  await db.payment.deleteMany();
  await db.orderItem.deleteMany();
  await db.order.deleteMany();
  await db.cartItem.deleteMany();
  await db.wishlistItem.deleteMany();
  await db.rewardEvent.deleteMany();
  await db.reward.deleteMany();
  await db.referralAttribution.deleteMany();
  await db.referralVisit.deleteMany();
  await db.emailToken.deleteMany();
  await db.session.deleteMany();
  await db.address.deleteMany();
  await db.review.deleteMany();
  await db.productVariant.deleteMany();
  await db.product.deleteMany();
  await db.category.deleteMany();
  await db.promotion.deleteMany();
  await db.rewardCampaign.deleteMany();
  await db.auditLog.deleteMany();
  await db.setting.deleteMany();
  await db.user.deleteMany();

  // --- categories + products ---
  let productCount = 0;
  let variantCount = 0;
  let reviewCount = 0;
  let reviewCursor = 0;

  for (const cat of CATEGORIES) {
    const catImage = writeArt(`cat-${cat.slug}.svg`, cat.hue, cat.name, "ZUVO");
    const category = await db.category.create({
      data: {
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        image: catImage,
        sortOrder: cat.sortOrder,
        active: true,
      },
    });

    for (const [idx, p] of cat.products.entries()) {
      // Real product photo (generated into public/p/<slug>.jpg). Falls back to
      // generated SVG art only if the photo file is missing.
      const photoFile = join(HERE, "..", "public", "p", `${p.slug}.jpg`);
      const images: string[] = existsSync(photoFile)
        ? [`/p/${p.slug}.jpg`]
        : [writeArt(`p-${p.slug}-1.svg`, cat.hue, p.name, p.brand)];
      const variantStock = (p.variants ?? []).reduce((s, v) => s + v.stock, 0);
      const rating = 3.9 + ((productCount * 7) % 11) / 10;
      const seededReviewCount = 8 + ((productCount * 53) % 110);

      const product = await db.product.create({
        data: {
          name: p.name,
          slug: p.slug,
          shortDesc: p.shortDesc,
          description: p.description,
          categoryId: category.id,
          brand: p.brand,
          priceCents: p.priceCents,
          originalPriceCents: p.originalPriceCents ?? null,
          currency: "USD",
          stock: p.variants?.length ? variantStock : p.stock,
          sku: p.sku,
          rating: Math.round(rating * 10) / 10,
          reviewCount: seededReviewCount,
          images,
          attributes: Object.fromEntries(p.attributes),
          featured: p.featured ?? false,
          deal: p.deal ?? false,
          active: true,
          variants: p.variants?.length
            ? {
                create: p.variants.map((v, i) => ({
                  name: v.name,
                  value: v.value,
                  priceDeltaCents: v.priceDeltaCents ?? 0,
                  stock: v.stock,
                  sku: v.sku,
                  sortOrder: i,
                })),
              }
            : undefined,
        },
      });
      productCount += 1;
      variantCount += p.variants?.length ?? 0;

      if (p.withReviews) {
        const n = 2 + (reviewCursor % 3); // 2-4 reviews
        const rows: ReviewSeed[] = [];
        for (let i = 0; i < n; i++) rows.push(REVIEW_POOL[(reviewCursor + i) % REVIEW_POOL.length]!);
        reviewCursor += n;
        await db.review.createMany({
          data: rows.map((r) => ({
            productId: product.id,
            authorName: r.authorName,
            rating: r.rating,
            title: r.title,
            body: r.body,
          })),
        });
        const avg = rows.reduce((s, r) => s + r.rating, 0) / rows.length;
        await db.product.update({
          where: { id: product.id },
          data: { rating: Math.round(avg * 10) / 10, reviewCount: rows.length },
        });
        reviewCount += rows.length;
      }
    }
  }

  // --- users ---
  const admin = await db.user.create({
    data: {
      name: "Store Admin",
      username: "admin",
      email: "admin@zuvo.demo",
      passwordHash: await bcrypt.hash("admin1234", 12),
      role: "ADMIN",
      referralCode: "SUMMER2K26",
      emailVerified: new Date(),
    },
  });
  await db.user.create({
    data: {
      name: "Demo Customer",
      username: "demo",
      email: "customer@zuvo.demo",
      passwordHash: await bcrypt.hash("demo1234", 12),
      role: "CUSTOMER",
      referralCode: "DEMO7X2K",
      referredById: admin.id,
      emailVerified: new Date(),
    },
  });

  // --- reward campaign ---
  await db.rewardCampaign.create({
    data: {
      name: "Welcome to ZUVO",
      amountCents: 2000,
      currency: "USD",
      type: "SIGNUP",
      status: "ACTIVE",
      label: "DEMO — NO CASH VALUE",
      terms: "Demo reward for new signups. One per account. No cash value; for demonstration only.",
    },
  });

  // --- promotion ---
  await db.promotion.create({
    data: {
      code: "WELCOME10",
      title: "10% off orders over $25",
      description: "New shoppers save 10% on orders of $25 or more.",
      discountType: "PERCENT",
      discountValue: 10,
      minOrderCents: 2500,
      active: true,
    },
  });

  // --- settings ---
  await db.setting.createMany({
    data: [
      {
        key: "announcements",
        value: JSON.stringify([
          "Discover today's deals.",
          "Explore new arrivals.",
          "Special offers on selected products.",
          "Demo store — no real payments.",
        ]),
      },
      { key: "site_name", value: "ZUVO" },
    ],
  });

  // --- referral visits (staggered) ---
  const now = Date.now();
  await db.referralVisit.createMany({
    data: [0, 1, 3, 5, 8].map((daysAgo) => ({
      code: "SUMMER2K26",
      createdAt: new Date(now - daysAgo * 24 * 60 * 60 * 1000),
    })),
  });

  console.log(`Done: 8 categories, ${productCount} products, ${variantCount} variants, ${reviewCount} reviews, 2 users, 1 campaign, 1 promotion, 2 settings, 5 referral visits.`);
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
