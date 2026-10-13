export const dynamic = "force-dynamic";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSessionUser, requireAdminPage} from "@/lib/auth";
import { SectionTitle, FormError, btnSecondary } from "@/components/ui";
import ProductForm, { type ProductInit } from "../_form";
import { parseProductForm, saveProduct } from "../_lib";
import { qp, type SearchParams } from "../../_helpers";

export default async function EditProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: SearchParams;
}) {
  await requireAdminPage(); // must run before any data fetch (see lib/auth.ts)
  const { id } = await params;
  const sp = await searchParams;

  const [product, categories] = await Promise.all([
    db.product.findUnique({ where: { id }, include: { variants: true } }),
    db.category.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
  ]);
  if (!product) notFound();

  const initial: ProductInit = {
    name: product.name,
    slug: product.slug,
    categoryId: product.categoryId,
    brand: product.brand ?? "",
    shortDesc: product.shortDesc ?? "",
    description: product.description ?? "",
    seoTitle: (product as { seoTitle?: string | null }).seoTitle ?? "",
    seoDescription: (product as { seoDescription?: string | null }).seoDescription ?? "",
    price: (product.priceCents / 100).toFixed(2),
    originalPrice: product.originalPriceCents ? (product.originalPriceCents / 100).toFixed(2) : "",
    currency: product.currency,
    stock: String(product.stock),
    sku: product.sku ?? "",
    images: ((product.images as string[] | null) ?? []).join(", "),
    attributes: Object.entries((product.attributes as Record<string, string> | null) ?? {})
      .map(([k, v]) => `${k}: ${v}`)
      .join("\n"),
    featured: product.featured,
    deal: product.deal,
    active: product.active,
    variants: product.variants.map((v) => ({
      key: v.id,
      id: v.id,
      name: v.name,
      value: v.value,
      priceDelta: v.priceDeltaCents ? (v.priceDeltaCents / 100).toString() : "",
      stock: String(v.stock),
      sku: v.sku ?? "",
    })),
  };

  async function updateProduct(formData: FormData) {
    "use server";
    const me = await getSessionUser();
    const outcome = await (async () => {
      try {
        const data = parseProductForm(formData);
        await saveProduct(id, data, me?.id);
        return { ok: true as const };
      } catch (e) {
        return { ok: false as const, error: e instanceof Error ? e.message : "Failed to update product." };
      }
    })();
    if (!outcome.ok) {
      redirect(`/admin/products/${id}?error=` + encodeURIComponent(outcome.error));
    }
    redirect(`/admin/products/${id}?saved=1`);
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-3">
        <SectionTitle title="Edit product" className="mb-0" />
        <Link href="/admin/products" className={btnSecondary}>
          Back to products
        </Link>
      </div>
      <FormError message={qp(sp, "error")} />
      {qp(sp, "saved") ? (
        <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          Product saved.
        </div>
      ) : null}
      <ProductForm
        action={updateProduct}
        categories={categories}
        initial={initial}
        submitLabel="Save changes"
      />
    </div>
  );
}
