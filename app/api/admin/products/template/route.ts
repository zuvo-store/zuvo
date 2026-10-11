export const dynamic = "force-dynamic";
import { requireAdminPage } from "@/lib/auth";

const HEADERS = [
  "name",
  "slug",
  "sku",
  "brand",
  "category_slug",
  "price",
  "original_price",
  "stock",
  "short_desc",
  "description",
  "active",
  "featured",
  "deal",
];

const EXAMPLE = [
  "Wireless Headphones",
  "",
  "WH-1000",
  "ZuvoAudio",
  "electronics",
  "29.99",
  "49.99",
  "50",
  "Great sound, comfy fit",
  "Premium wireless headphones with noise cancellation.",
  "true",
  "false",
  "true",
];

function csvCell(v: string) {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export async function GET() {
  await requireAdminPage();
  const csv = [HEADERS.join(","), EXAMPLE.map(csvCell).join(",")].join("\n") + "\n";
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="zuvo-products-template.csv"',
    },
  });
}
