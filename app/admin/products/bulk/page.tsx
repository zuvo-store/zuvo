export const dynamic = "force-dynamic";
import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSessionUser, requireAdminPage } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { btnPrimary, btnSecondary, inputCls, FormError } from "@/components/ui";

const HEADERS = [
  "name",
  "slug",
  "sku",
  "brand",
  "category_slug",
  "price",
  "original_price",
  "cost",
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
] as const;

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

/** Minimal CSV parser: handles quotes, commas inside quotes, newlines inside quotes. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(cell);
      cell = "";
    } else if (c === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (c === "\r") {
      // skip
    } else {
      cell += c;
    }
  }
  if (cell !== "" || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

function toBool(v: string | undefined, fallback: boolean): boolean {
  if (v == null || v.trim() === "") return fallback;
  return ["1", "true", "yes", "y"].includes(v.trim().toLowerCase());
}

/** Pipe-separated image paths: "/p/a.jpg|/p/b.jpg" -> ["...","..."] */
function parseImages(v: string | undefined): string[] {
  if (!v) return [];
  return v
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Pipe-separated key:value pairs: "color:Red|material:Cotton" -> {color:"Red",...} */
function parseAttributes(v: string | undefined): Record<string, string> | undefined {
  if (!v) return undefined;
  const obj: Record<string, string> = {};
  for (const part of v.split("|")) {
    const i = part.indexOf(":");
    if (i > 0) {
      const k = part.slice(0, i).trim();
      const val = part.slice(i + 1).trim();
      if (k && val) obj[k] = val;
    }
  }
  return Object.keys(obj).length > 0 ? obj : undefined;
}

/**
 * Single-dimension variants, e.g.:
 *   variant_name=Size, variant_values="S|M|L",
 *   variant_price_deltas="0|2.00|4.00" (dollars), variant_stocks="10|20|15"
 */
function parseVariants(
  row: string[],
  idx: (h: string) => number,
  fallbackStock: number
): { name: string; value: string; priceDeltaCents: number; stock: number }[] {
  const name = (row[idx("variant_name")] ?? "").trim();
  const valuesRaw = (row[idx("variant_values")] ?? "").trim();
  if (!name || !valuesRaw) return [];
  const values = valuesRaw.split("|").map((s) => s.trim()).filter(Boolean);
  if (values.length === 0) return [];
  const deltas = (row[idx("variant_price_deltas")] ?? "").split("|");
  const stocks = (row[idx("variant_stocks")] ?? "").split("|");
  return values.map((value, i) => ({
    name,
    value,
    priceDeltaCents: Math.round(Number(deltas[i] ?? "0") * 100) || 0,
    stock: Math.max(0, Math.round(Number(stocks[i] ?? String(fallbackStock)) || 0)),
  }));
}

async function uploadCsv(formData: FormData) {
  "use server";
  await requireAdminPage();
  const me = await getSessionUser();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    redirect("/admin/products/bulk?error=" + encodeURIComponent("Please choose a CSV file to upload."));
  }
  if (file.size > 2 * 1024 * 1024) {
    redirect("/admin/products/bulk?error=" + encodeURIComponent("File too large (max 2 MB)."));
  }
  const text = await file.text();
  const rows = parseCsv(text);
  if (rows.length < 2) {
    redirect("/admin/products/bulk?error=" + encodeURIComponent("CSV is empty — download the template and fill in rows."));
  }
  const headerRow = rows[0]!.map((h) => h.trim().toLowerCase());
  const missing = HEADERS.filter((h) => !headerRow.includes(h));
  if (missing.length > 0) {
    redirect(
      "/admin/products/bulk?error=" +
        encodeURIComponent("Missing headings: " + missing.join(", ") + ". Do not change the template headings.")
    );
  }
  const idx = (h: string) => headerRow.indexOf(h);

  const categories = await db.category.findMany({ select: { id: true, slug: true } });
  const catBySlug = new Map(categories.map((c) => [c.slug.toLowerCase(), c.id]));

  let created = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r]!;
    const lineNo = r + 1;
    try {
      const name = (row[idx("name")] ?? "").trim();
      if (!name) {
        skipped++;
        continue;
      }
      const slugRaw = (row[idx("slug")] ?? "").trim();
      const slug = slugRaw ? slugify(slugRaw) : slugify(name);
      const catSlug = (row[idx("category_slug")] ?? "").trim().toLowerCase();
      const categoryId = catBySlug.get(catSlug);
      if (!categoryId) {
        errors.push(`Row ${lineNo}: unknown category_slug "${catSlug}".`);
        skipped++;
        continue;
      }
      const price = Math.round(Number(row[idx("price")] ?? "0") * 100);
      if (!Number.isFinite(price) || price <= 0) {
        errors.push(`Row ${lineNo}: invalid price.`);
        skipped++;
        continue;
      }
      const origRaw = (row[idx("original_price")] ?? "").trim();
      const originalPriceCents = origRaw ? Math.round(Number(origRaw) * 100) : null;
      const stock = Math.max(0, Math.round(Number(row[idx("stock")] ?? "0") || 0));

      const exists = await db.product.findUnique({ where: { slug } });
      if (exists) {
        errors.push(`Row ${lineNo}: slug "${slug}" already exists — skipped.`);
        skipped++;
        continue;
      }

      await db.product.create({
        data: {
          name,
          slug,
          sku: (row[idx("sku")] ?? "").trim() || null,
          brand: (row[idx("brand")] ?? "").trim() || null,
          categoryId,
          priceCents: price,
          costCents: Math.max(0, Math.round(Number(row[idx("cost")] ?? "0") * 100) || 0),
          originalPriceCents: Number.isFinite(originalPriceCents) && (originalPriceCents ?? 0) > 0 ? originalPriceCents : null,
          stock,
          shortDesc: (row[idx("short_desc")] ?? "").trim() || null,
          description: (row[idx("description")] ?? "").trim() || null,
          images: parseImages(row[idx("images")]),
          attributes: parseAttributes(row[idx("attributes")]),
          active: toBool(row[idx("active")], true),
          featured: toBool(row[idx("featured")], false),
          deal: toBool(row[idx("deal")], false),
          variants: {
            create: parseVariants(row, idx, stock),
          },
        },
      });
      created++;
    } catch (e) {
      errors.push(`Row ${lineNo}: ${e instanceof Error ? e.message : "failed"}.`);
      skipped++;
    }
  }

  await audit("product.bulk_upload", {
    actorId: me?.id ?? "unknown",
    entity: "Product",
    meta: { created, skipped, fileName: file.name },
  });

  const params = new URLSearchParams();
  params.set("created", String(created));
  params.set("skipped", String(skipped));
  if (errors.length > 0) params.set("rowErrors", errors.slice(0, 10).join(" | "));
  redirect("/admin/products/bulk?" + params.toString());
}

export default async function BulkUploadPage({
  searchParams,
}: {
  searchParams: Promise<{ [k: string]: string | string[] | undefined }>;
}) {
  await requireAdminPage();
  const sp = (await searchParams) as Record<string, string | undefined>;
  const err = typeof sp.error === "string" ? sp.error : undefined;
  const created = typeof sp.created === "string" ? sp.created : undefined;
  const skipped = typeof sp.skipped === "string" ? sp.skipped : undefined;
  const rowErrors = typeof sp.rowErrors === "string" ? sp.rowErrors : undefined;
  const categories = await db.category.findMany({
    orderBy: { sortOrder: "asc" },
    select: { name: true, slug: true },
  });

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Bulk upload products</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Download the template, fill in your products, upload the CSV — done.
          </p>
        </div>
        <Link href="/admin/products" className={btnSecondary}>
          Back
        </Link>
      </div>

      <FormError message={err} />
      {created !== undefined && (
        <div className="mb-4 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          ✅ <strong>{created}</strong> product{created === "1" ? "" : "s"} created
          {skipped && skipped !== "0" ? (
            <>
              , <strong>{skipped}</strong> skipped
            </>
          ) : null}
          .
          {rowErrors ? <p className="mt-2 text-xs">⚠️ {rowErrors}</p> : null}
        </div>
      )}

      {/* Step 1 — template */}
      <section className="mb-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-zinc-900">Step 1 — Download template</h2>
        <p className="mt-1 text-sm text-zinc-600">
          ⚠️ <strong>Do not change the headings.</strong> Fill one product per row below them.
          Prices are in dollars (e.g. <code>29.99</code>).
        </p>
        <a href="/api/admin/products/template" download className={`${btnSecondary} mt-3 inline-block`}>
          ⬇️ Download CSV template
        </a>
        {categories.length > 0 && (
          <p className="mt-3 text-xs text-zinc-500">
            Valid <code>category_slug</code> values:{" "}
            {categories.map((c) => (
              <code key={c.slug} className="mr-1 rounded bg-zinc-100 px-1.5 py-0.5">
                {c.slug}
              </code>
            ))}
          </p>
        )}
      </section>

      {/* Step 2 — upload */}
      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-zinc-900">Step 2 — Upload filled CSV</h2>
        <form action={uploadCsv} className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            type="file"
            name="file"
            accept=".csv,text/csv"
            required
            className="block w-full text-sm text-zinc-600 file:mr-3 file:rounded-full file:border-0 file:bg-orange-100 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-orange-700 hover:file:bg-orange-200"
          />
          <button type="submit" className={`${btnPrimary} shrink-0`}>
            ⬆️ Upload & create
          </button>
        </form>
        <ul className="mt-4 list-disc space-y-1 pl-5 text-xs text-zinc-500">
          <li>Rows with an existing slug are skipped (no duplicates).</li>
          <li>Empty <code>slug</code> → auto-generated from the product name.</li>
          <li>Unknown <code>category_slug</code> rows are skipped with a warning.</li>
          <li><code>images</code>: pipe-separated paths, e.g. <code>/p/a.jpg|/p/b.jpg</code></li>
          <li><code>attributes</code>: pipe-separated <code>key:value</code>, e.g. <code>color:Red|material:Cotton</code></li>
          <li><code>variant_name</code> + <code>variant_values</code> (pipe-separated, e.g. <code>S|M|L</code>) create size/color variants. Optional <code>variant_price_deltas</code> (dollars) and <code>variant_stocks</code> per value.</li>
          <li>Max file size 2 MB.</li>
        </ul>
      </section>
    </div>
  );
}
