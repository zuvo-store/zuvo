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
  "images",
  "attributes",
  "variant_name",
  "variant_values",
  "variant_price_deltas",
  "variant_stocks",
  "active",
  "featured",
  "deal",
];

const EXAMPLE = [
  "Cotton T-Shirt",
  "",
  "TS-100",
  "ZuvoWear",
  "fashion",
  "19.99",
  "29.99",
  "100",
  "Soft cotton tee",
  "Premium 100% cotton t-shirt, comfortable fit.",
  "/p/tshirt-1.jpg|/p/tshirt-2.jpg",
  "color:White|material:Cotton|fit:Regular",
  "Size",
  "S|M|L|XL",
  "0|0|2.00|2.00",
  "25|30|25|20",
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
