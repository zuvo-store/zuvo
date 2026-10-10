import { db } from "@/lib/db";
import { toCents } from "@/lib/money";
import { audit } from "@/lib/audit";

export type VariantInput = {
  id?: string;
  name: string;
  value: string;
  priceDeltaCents: number;
  stock: number;
  sku: string | null;
};

export type ProductFormData = {
  name: string;
  slug: string;
  categoryId: string;
  brand: string | null;
  shortDesc: string | null;
  description: string | null;
  priceCents: number;
  originalPriceCents: number | null;
  currency: string;
  stock: number;
  sku: string | null;
  images: string[];
  attributes: Record<string, string> | null;
  featured: boolean;
  deal: boolean;
  active: boolean;
  variants: VariantInput[];
};

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

/** Validate + normalize admin product form fields. Throws on invalid input. */
export function parseProductForm(fd: FormData): ProductFormData {
  const str = (k: string) => {
    const v = fd.get(k);
    return typeof v === "string" ? v.trim() : "";
  };

  const name = str("name");
  if (!name) throw new Error("Name is required.");

  const slug = str("slug") || slugify(name);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error("Slug must be lowercase letters, numbers and single hyphens.");
  }

  const categoryId = str("categoryId");
  if (!categoryId) throw new Error("Category is required.");

  const price = Number(str("price"));
  if (!Number.isFinite(price) || price < 0) throw new Error("Price must be a non-negative number.");
  const priceCents = toCents(price);

  let originalPriceCents: number | null = null;
  const opRaw = str("originalPrice");
  if (opRaw) {
    const op = Number(opRaw);
    if (!Number.isFinite(op) || op < 0) throw new Error("Original price must be a non-negative number.");
    if (op > price) originalPriceCents = toCents(op);
  }

  const stockRaw = str("stock");
  const stock = stockRaw === "" ? 0 : Number(stockRaw);
  if (!Number.isInteger(stock) || stock < 0) {
    throw new Error("Stock must be a non-negative integer.");
  }

  const images = str("images")
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  for (const im of images) {
    if (!im.startsWith("/p/")) throw new Error(`Image paths must start with /p/ — got "${im}".`);
  }

  const attributes: Record<string, string> = {};
  for (const line of str("attributes").split("\n")) {
    const t = line.trim();
    if (!t) continue;
    const i = t.indexOf(":");
    if (i <= 0) throw new Error(`Attribute lines must look like "key: value" — got "${t}".`);
    attributes[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }

  let variants: VariantInput[] = [];
  const vRaw = str("variantsJson");
  if (vRaw) {
    let arr: unknown;
    try {
      arr = JSON.parse(vRaw);
    } catch {
      throw new Error("Invalid variants payload.");
    }
    if (!Array.isArray(arr)) throw new Error("Invalid variants payload.");
    variants = (arr as Array<Record<string, unknown>>).map((v, idx) => {
      const vname = String(v.name ?? "").trim();
      const vval = String(v.value ?? "").trim();
      if (!vname || !vval) throw new Error(`Variant row ${idx + 1}: name and value are required.`);
      const pdRaw = String(v.priceDelta ?? "").trim();
      const pd = pdRaw === "" ? 0 : Number(pdRaw);
      if (!Number.isFinite(pd)) throw new Error(`Variant row ${idx + 1}: price delta must be a number.`);
      const vsRaw = String(v.stock ?? "").trim();
      const vs = vsRaw === "" ? 0 : Number(vsRaw);
      if (!Number.isInteger(vs) || vs < 0) {
        throw new Error(`Variant row ${idx + 1}: stock must be a non-negative integer.`);
      }
      const sku = String(v.sku ?? "").trim();
      return {
        id: typeof v.id === "string" && v.id ? v.id : undefined,
        name: vname,
        value: vval,
        priceDeltaCents: toCents(pd),
        stock: vs,
        sku: sku || null,
      };
    });
  }

  return {
    name,
    slug,
    categoryId,
    brand: str("brand") || null,
    shortDesc: str("shortDesc") || null,
    description: str("description") || null,
    priceCents,
    originalPriceCents,
    currency: (str("currency") || "USD").toUpperCase(),
    stock,
    sku: str("sku") || null,
    images,
    attributes: Object.keys(attributes).length > 0 ? attributes : null,
    featured: fd.get("featured") === "on",
    deal: fd.get("deal") === "on",
    active: fd.get("active") === "on",
    variants,
  };
}

/** Create (id=null) or update a product incl. variant diffing. Audits the change. */
export async function saveProduct(id: string | null, d: ProductFormData, actorId?: string) {
  const fields = {
    name: d.name,
    slug: d.slug,
    categoryId: d.categoryId,
    brand: d.brand,
    shortDesc: d.shortDesc,
    description: d.description,
    priceCents: d.priceCents,
    originalPriceCents: d.originalPriceCents,
    currency: d.currency,
    stock: d.stock,
    sku: d.sku,
    images: d.images,
    attributes: d.attributes ?? undefined,
    featured: d.featured,
    deal: d.deal,
    active: d.active,
  };
  try {
    if (id) {
      const existing = await db.product.findUniqueOrThrow({
        where: { id },
        include: { variants: { select: { id: true } } },
      });
      const keep = new Set(
        d.variants.map((v) => v.id).filter((x): x is string => Boolean(x))
      );
      const updated = await db.$transaction(async (tx) => {
        const row = await tx.product.update({ where: { id }, data: fields });
        const stale = existing.variants.map((v) => v.id).filter((cid) => !keep.has(cid));
        if (stale.length > 0) {
          await tx.productVariant.deleteMany({ where: { id: { in: stale } } });
        }
        for (const v of d.variants) {
          if (v.id) {
            await tx.productVariant.update({
              where: { id: v.id },
              data: {
                name: v.name,
                value: v.value,
                priceDeltaCents: v.priceDeltaCents,
                stock: v.stock,
                sku: v.sku,
              },
            });
          } else {
            await tx.productVariant.create({
              data: {
                productId: id,
                name: v.name,
                value: v.value,
                priceDeltaCents: v.priceDeltaCents,
                stock: v.stock,
                sku: v.sku,
              },
            });
          }
        }
        return row;
      });
      await audit("product.update", {
        actorId,
        entity: "Product",
        entityId: id,
        meta: { slug: d.slug, variants: d.variants.length },
      });
      return updated;
    }
    const created = await db.product.create({
      data: {
        ...fields,
        variants: {
          create: d.variants.map((v) => ({
            name: v.name,
            value: v.value,
            priceDeltaCents: v.priceDeltaCents,
            stock: v.stock,
            sku: v.sku,
          })),
        },
      },
    });
    await audit("product.create", {
      actorId,
      entity: "Product",
      entityId: created.id,
      meta: { slug: d.slug, variants: d.variants.length },
    });
    return created;
  } catch (e) {
    if (typeof e === "object" && e !== null && "code" in e && (e as { code?: unknown }).code === "P2002") {
      throw new Error("Slug or SKU is already in use by another product.");
    }
    throw e;
  }
}
