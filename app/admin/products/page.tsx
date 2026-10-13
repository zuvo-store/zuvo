export const dynamic = "force-dynamic";
import Link from "next/link";
import { db } from "@/lib/db";
import { formatUSD } from "@/lib/money";
import { audit } from "@/lib/audit";
import { getSessionUser, requireAdminPage} from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { btnPrimary, btnSecondary, inputCls, Badge, FormError } from "@/components/ui";
import EmptyState from "@/components/EmptyState";
import Pagination from "@/components/Pagination";
import { qp, pageNumber, tableWrapCls, tableCls, thCls, tdCls, type SearchParams } from "../_helpers";

const PAGE_SIZE = 20;

async function toggleFlag(formData: FormData) {
  "use server";
  const id = String(formData.get("id") ?? "");
  const field = String(formData.get("field") ?? "");
  if (!["active", "deal", "featured"].includes(field) || !id) {
    redirect("/admin/products?error=" + encodeURIComponent("Invalid toggle request."));
  }
  const me = await getSessionUser();
  const outcome = await (async () => {
    try {
      const p = await db.product.findUniqueOrThrow({ where: { id } });
      const to = field === "active" ? !p.active : field === "deal" ? !p.deal : !p.featured;
      const data = field === "active" ? { active: to } : field === "deal" ? { deal: to } : { featured: to };
      await db.product.update({ where: { id }, data });
      await audit("product.toggle", {
        actorId: me?.id,
        entity: "Product",
        entityId: id,
        meta: { field, to },
      });
      return { ok: true as const };
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : "Toggle failed." };
    }
  })();
  if (!outcome.ok) redirect("/admin/products?error=" + encodeURIComponent(outcome.error));
  revalidatePath("/admin/products");
}

function ToggleButton({
  id,
  field,
  on,
  label,
}: {
  id: string;
  field: "active" | "deal" | "featured";
  on: boolean;
  label: string;
}) {
  return (
    <form action={toggleFlag} className="inline">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="field" value={field} />
      <button
        type="submit"
        title={`Toggle ${label}`}
        className={`rounded-full px-2 py-0.5 text-xs font-semibold transition ${
          on ? "bg-green-100 text-green-800 hover:bg-green-200" : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
        }`}
      >
        {label}
      </button>
    </form>
  );
}

export default async function AdminProductsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdminPage(); // must run before any data fetch (see lib/auth.ts)
  const sp = await searchParams;
  const q = (qp(sp, "q") ?? "").trim();
  const page = pageNumber(sp);

  const where = q
    ? {
        OR: [
          { name: { contains: q } },
          { slug: { contains: q } },
          { sku: { contains: q } },
          { brand: { contains: q } },
        ],
      }
    : {};

  const [total, products] = await Promise.all([
    db.product.count({ where }),
    db.product.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { category: { select: { name: true } } },
    }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Products</h1>
          <p className="mt-1 text-sm text-zinc-500">{total} product{total === 1 ? "" : "s"}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/products/bulk" className={btnSecondary}>
            ⬆️ Bulk upload
          </Link>
          <Link href="/admin/products/new" className={btnPrimary}>
            New product
          </Link>
        </div>
      </div>

      <FormError message={qp(sp, "error")} />

      <form method="get" className="mb-4 flex gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search name, slug, SKU, brand…"
          className={`${inputCls} max-w-sm`}
        />
        <button type="submit" className={btnSecondary}>
          Search
        </button>
        {q ? (
          <Link href="/admin/products" className={btnSecondary}>
            Clear
          </Link>
        ) : null}
      </form>

      {products.length === 0 ? (
        <EmptyState
          title="No products found"
          message={q ? "Try a different search term." : "Create your first product to get started."}
          actionHref="/admin/products/new"
          actionLabel="New product"
        />
      ) : (
        <div className={tableWrapCls}>
          <table className={tableCls}>
            <thead>
              <tr>
                <th className={thCls}>Product</th>
                <th className={thCls}>Category</th>
                <th className={thCls}>Price</th>
                <th className={thCls}>Stock</th>
                <th className={thCls}>Flags</th>
                <th className={thCls}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {products.map((p) => {
                const images = (p.images as string[] | null) ?? [];
                return (
                  <tr key={p.id} className="hover:bg-zinc-50">
                    <td className={tdCls}>
                      <div className="flex items-center gap-3">
                        {images[0] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={images[0]} alt="" className="h-10 w-10 rounded-lg border border-zinc-200 object-cover" />
                        ) : (
                          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 text-xs text-zinc-400">
                            —
                          </span>
                        )}
                        <div>
                          <Link
                            href={`/admin/products/${p.id}`}
                            className="font-medium text-zinc-900 hover:text-orange-700 hover:underline"
                          >
                            {p.name}
                          </Link>
                          <p className="text-xs text-zinc-500">{p.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className={tdCls}>{p.category.name}</td>
                    <td className={tdCls}>
                      <span className="font-semibold">{formatUSD(p.priceCents)}</span>
                      {p.originalPriceCents && p.originalPriceCents > p.priceCents ? (
                        <span className="ml-1 text-xs text-zinc-400 line-through">
                          {formatUSD(p.originalPriceCents)}
                        </span>
                      ) : null}
                    </td>
                    <td className={tdCls}>
                      <Badge tone={p.stock === 0 ? "red" : p.stock < 10 ? "amber" : "zinc"}>
                        {p.stock}
                      </Badge>
                    </td>
                    <td className={tdCls}>
                      <div className="flex flex-wrap gap-1">
                        <ToggleButton id={p.id} field="active" on={p.active} label="active" />
                        <ToggleButton id={p.id} field="deal" on={p.deal} label="deal" />
                        <ToggleButton id={p.id} field="featured" on={p.featured} label="featured" />
                      </div>
                    </td>
                    <td className={tdCls}>
                      <Link
                        href={`/admin/products/${p.id}`}
                        className="font-semibold text-orange-700 hover:underline"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} basePath="/admin/products" />
    </div>
  );
}
