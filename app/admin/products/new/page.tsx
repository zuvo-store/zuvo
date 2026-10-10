export const dynamic = "force-dynamic";
import Link from "next/link";
import { db } from "@/lib/db";
import { getSessionUser, requireAdminPage} from "@/lib/auth";
import { redirect } from "next/navigation";
import { SectionTitle, FormError, btnSecondary } from "@/components/ui";
import ProductForm from "../_form";
import { parseProductForm, saveProduct } from "../_lib";
import { qp, type SearchParams } from "../../_helpers";

export default async function NewProductPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdminPage(); // must run before any data fetch (see lib/auth.ts)
  const sp = await searchParams;
  const categories = await db.category.findMany({
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true },
  });

  async function createProduct(formData: FormData) {
    "use server";
    const me = await getSessionUser();
    const outcome: { id?: string; error?: string } = await (async () => {
      try {
        const data = parseProductForm(formData);
        const created = await saveProduct(null, data, me?.id);
        return { id: created.id as string };
      } catch (e) {
        return { error: e instanceof Error ? e.message : "Failed to create product." };
      }
    })();
    if (outcome.error) {
      redirect("/admin/products/new?error=" + encodeURIComponent(outcome.error));
    }
    if (!outcome.id) {
      redirect("/admin/products/new?error=" + encodeURIComponent("Failed to create product."));
    }
    redirect(`/admin/products/${outcome.id}?saved=1`);
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-3">
        <SectionTitle title="New product" className="mb-0" />
        <Link href="/admin/products" className={btnSecondary}>
          Back to products
        </Link>
      </div>
      <FormError message={qp(sp, "error")} />
      {categories.length === 0 ? (
        <FormError message="Create a category first before adding products." />
      ) : (
        <ProductForm action={createProduct} categories={categories} submitLabel="Create product" />
      )}
    </div>
  );
}
