export const dynamic = "force-dynamic";
import Link from "next/link";
import { Fragment } from "react";
import { db } from "@/lib/db";
import { formatUSD } from "@/lib/money";
import { audit } from "@/lib/audit";
import { getSessionUser, requireAdminPage} from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { btnSecondary, Badge, FormError, SectionTitle } from "@/components/ui";
import EmptyState from "@/components/EmptyState";
import { qp, tableWrapCls, tableCls, thCls, tdCls, type SearchParams } from "../_helpers";

async function setStock(formData: FormData) {
  "use server";
  const me = await getSessionUser();
  const productId = String(formData.get("productId") ?? "") || null;
  const variantId = String(formData.get("variantId") ?? "") || null;
  const qtyRaw = String(formData.get("qty") ?? "").trim();
  const qty = Number(qtyRaw);
  const back = "/admin/inventory" + (formData.get("low") ? "?low=1" : "");
  if (!Number.isInteger(qty) || qty < 0) {
    redirect(back + (back.includes("?") ? "&" : "?") + "error=" + encodeURIComponent("Stock must be a non-negative integer."));
  }
  const outcome = await (async () => {
    try {
      if (variantId) {
        const v = await db.productVariant.findUniqueOrThrow({ where: { id: variantId } });
        await db.productVariant.update({ where: { id: variantId }, data: { stock: qty } });
        await audit("inventory.set", {
          actorId: me?.id,
          entity: "ProductVariant",
          entityId: variantId,
          meta: { from: v.stock, to: qty },
        });
      } else if (productId) {
        const p = await db.product.findUniqueOrThrow({ where: { id: productId } });
        await db.product.update({ where: { id: productId }, data: { stock: qty } });
        await audit("inventory.set", {
          actorId: me?.id,
          entity: "Product",
          entityId: productId,
          meta: { from: p.stock, to: qty },
        });
      } else {
        throw new Error("Missing product or variant id.");
      }
      return { ok: true as const };
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : "Failed to set stock." };
    }
  })();
  if (!outcome.ok) {
    redirect(back + (back.includes("?") ? "&" : "?") + "error=" + encodeURIComponent(outcome.error));
  }
  revalidatePath("/admin/inventory");
}

function StockForm({
  productId,
  variantId,
  stock,
  low,
}: {
  productId?: string;
  variantId?: string;
  stock: number;
  low: boolean;
}) {
  return (
    <form action={setStock} className="flex items-center gap-1.5">
      {productId ? <input type="hidden" name="productId" value={productId} /> : null}
      {variantId ? <input type="hidden" name="variantId" value={variantId} /> : null}
      {low ? <input type="hidden" name="low" value="1" /> : null}
      <input
        name="qty"
        inputMode="numeric"
        defaultValue={String(stock)}
        aria-label="Stock quantity"
        className="w-20 rounded-lg border border-zinc-300 px-2 py-1 text-sm"
      />
      <button type="submit" className={`${btnSecondary} px-2.5 py-1 text-xs`}>
        Set
      </button>
    </form>
  );
}

export default async function AdminInventoryPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdminPage(); // must run before any data fetch (see lib/auth.ts)
  const sp = await searchParams;
  const lowOnly = qp(sp, "low") === "1";

  const products = await db.product.findMany({
    where: lowOnly
      ? { OR: [{ stock: { lt: 10 } }, { variants: { some: { stock: { lt: 10 } } } }] }
      : {},
    include: { variants: { orderBy: { name: "asc" } }, category: { select: { name: true } } },
    orderBy: { name: "asc" },
    take: 200,
  });

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <SectionTitle title="Inventory" className="mb-0" />
          <p className="mt-1 text-sm text-zinc-500">
            {products.length} product{products.length === 1 ? "" : "s"} shown
          </p>
        </div>
        {lowOnly ? (
          <Link href="/admin/inventory" className={btnSecondary}>
            Show all
          </Link>
        ) : (
          <Link href="/admin/inventory?low=1" className={btnSecondary}>
            Low stock only
          </Link>
        )}
      </div>

      <FormError message={qp(sp, "error")} />

      {products.length === 0 ? (
        <EmptyState
          title={lowOnly ? "No low-stock items" : "No products"}
          message={lowOnly ? "Nothing is below 10 units." : "Add products to manage inventory."}
          actionHref="/admin/products/new"
          actionLabel="New product"
        />
      ) : (
        <div className={tableWrapCls}>
          <table className={tableCls}>
            <thead>
              <tr>
                <th className={thCls}>Product / Variant</th>
                <th className={thCls}>SKU</th>
                <th className={thCls}>Price</th>
                <th className={thCls}>Stock</th>
                <th className={thCls}>Set stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {products.map((p) => (
                <Fragment key={p.id}>
                  <tr key={p.id} className="bg-zinc-50/60 hover:bg-zinc-50">
                    <td className={tdCls}>
                      <Link href={`/admin/products/${p.id}`} className="font-semibold text-zinc-900 hover:text-orange-700 hover:underline">
                        {p.name}
                      </Link>
                      <span className="ml-2 text-xs text-zinc-500">{p.category.name}</span>
                      {p.variants.length > 0 ? (
                        <span className="ml-2 text-xs text-zinc-400">({p.variants.length} variants)</span>
                      ) : null}
                    </td>
                    <td className={tdCls}>{p.sku ?? "—"}</td>
                    <td className={tdCls}>{formatUSD(p.priceCents)}</td>
                    <td className={tdCls}>
                      {p.variants.length === 0 ? (
                        <Badge tone={p.stock === 0 ? "red" : p.stock < 10 ? "amber" : "zinc"}>{p.stock}</Badge>
                      ) : (
                        <span className="text-xs text-zinc-400">via variants</span>
                      )}
                    </td>
                    <td className={tdCls}>
                      {p.variants.length === 0 ? (
                        <StockForm productId={p.id} stock={p.stock} low={lowOnly} />
                      ) : null}
                    </td>
                  </tr>
                  {p.variants.map((v) => (
                    <tr key={v.id} className="hover:bg-zinc-50">
                      <td className={`${tdCls} pl-8`}>
                        <span className="text-zinc-600">
                          {v.name}: {v.value}
                        </span>
                      </td>
                      <td className={tdCls}>{v.sku ?? "—"}</td>
                      <td className={tdCls}>
                        {v.priceDeltaCents !== 0 ? (
                          <span className="text-xs text-zinc-500">
                            {v.priceDeltaCents > 0 ? "+" : ""}
                            {formatUSD(v.priceDeltaCents)}
                          </span>
                        ) : (
                          <span className="text-xs text-zinc-400">base</span>
                        )}
                      </td>
                      <td className={tdCls}>
                        <Badge tone={v.stock === 0 ? "red" : v.stock < 10 ? "amber" : "zinc"}>{v.stock}</Badge>
                      </td>
                      <td className={tdCls}>
                        <StockForm variantId={v.id} stock={v.stock} low={lowOnly} />
                      </td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
