export const dynamic = "force-dynamic";
import Link from "next/link";
import { db } from "@/lib/db";
import { formatUSD } from "@/lib/money";
import { cardCls, SectionTitle, Badge, inputCls, btnPrimary } from "@/components/ui";
import { requireAdminPage } from "@/lib/auth";
import { qp, pageNumber, fmtDate, tableWrapCls, tableCls, thCls, tdCls } from "../_helpers";
import AdjustStockModal from "./AdjustStockModal";

type SP = { q?: string; cat?: string; from?: string; to?: string; view?: string; mtype?: string; page?: string; stock?: string; sort?: string; dir?: string };

const PAGE_SIZE = 20;
const STOCK_FILTERS = ["out", "low", "in"] as const;
type StockFilter = (typeof STOCK_FILTERS)[number] | "";
const SORT_KEYS = ["name", "price", "stock", "value"] as const;
type SortKey = (typeof SORT_KEYS)[number];
const DEFAULT_SORT: SortKey = "name";
const MOVE_TYPES = ["PURCHASE", "SALE", "DAMAGE", "MISSING", "RETURN", "ADJUSTMENT"] as const;
const TYPE_META: Record<string, { icon: string; tone: string; label: string }> = {
  PURCHASE: { icon: "📥", tone: "green", label: "Purchase" },
  SALE: { icon: "🛒", tone: "blue", label: "Sale" },
  DAMAGE: { icon: "🔴", tone: "red", label: "Damage" },
  MISSING: { icon: "🟡", tone: "amber", label: "Missing" },
  RETURN: { icon: "🟢", tone: "emerald", label: "Return" },
  ADJUSTMENT: { icon: "✏️", tone: "zinc", label: "Adjustment" },
};

function isoDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default async function AdminInventoryPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireAdminPage();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const cat = sp.cat ?? "";
  const view = sp.view === "movements" ? "movements" : "stock";
  const mtype = (MOVE_TYPES as readonly string[]).includes(sp.mtype ?? "") ? sp.mtype! : "";
  const stockFilter: StockFilter = (STOCK_FILTERS as readonly string[]).includes(sp.stock ?? "") ? (sp.stock as StockFilter) : "";
  const sort: SortKey = (SORT_KEYS as readonly string[]).includes(sp.sort ?? "") ? (sp.sort as SortKey) : DEFAULT_SORT;
  const dir: "asc" | "desc" = sp.dir === "desc" ? "desc" : "asc";
  const sortActive = sort !== DEFAULT_SORT || dir !== "asc";
  const page = pageNumber(sp);
  const now = new Date();
  const fromStr = sp.from ?? isoDay(new Date(now.getTime() - 29 * 864e5));
  const toStr = sp.to ?? isoDay(now);

  const categories = await db.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } });

  // --- Tiles ---
  const [productCount, productsForValue, moveAgg] = await Promise.all([
    db.product.count(),
    db.product.findMany({ select: { stock: true, priceCents: true } }),
    db.stockMovement.findMany({
      where: {
        createdAt: { gte: new Date(fromStr + "T00:00:00"), lte: new Date(toStr + "T23:59:59") },
        type: { in: ["DAMAGE", "MISSING", "RETURN"] },
      },
      select: { qty: true, type: true, product: { select: { priceCents: true } } },
      take: 10000,
    }),
  ]);
  const stockUnits = productsForValue.reduce((a, p) => a + p.stock, 0);
  const stockValue = productsForValue.reduce((a, p) => a + p.stock * p.priceCents, 0);

  const tileStats: Record<string, { qty: number; value: number }> = {
    DAMAGE: { qty: 0, value: 0 },
    MISSING: { qty: 0, value: 0 },
    RETURN: { qty: 0, value: 0 },
  };
  for (const m of moveAgg) {
    const s = tileStats[m.type];
    if (s) {
      const aq = Math.abs(m.qty);
      s.qty += aq;
      s.value += aq * (m.product?.priceCents ?? 0);
    }
  }

  const baseParams = new URLSearchParams();
  if (q) baseParams.set("q", q);
  if (cat) baseParams.set("cat", cat);
  if (stockFilter) baseParams.set("stock", stockFilter);
  if (sortActive) {
    baseParams.set("sort", sort);
    baseParams.set("dir", dir);
  }
  baseParams.set("from", fromStr);
  baseParams.set("to", toStr);

  const tileLink = (t: string) => {
    const p = new URLSearchParams(baseParams);
    p.set("view", "movements");
    p.set("mtype", t);
    return `/admin/inventory?${p.toString()}`;
  };

  const tiles = [
    { icon: "📦", label: "Products", value: String(productCount), sub: null as string | null, href: null as string | null, active: false },
    { icon: "📊", label: "Stock units", value: stockUnits.toLocaleString(), sub: null, href: null, active: false },
    { icon: "💰", label: "Stock value", value: formatUSD(stockValue), sub: null, href: null, active: false },
    { icon: "🔴", label: "Damaged", value: `${tileStats.DAMAGE.qty.toLocaleString()} units`, sub: formatUSD(tileStats.DAMAGE.value), href: tileLink("DAMAGE"), active: mtype === "DAMAGE" },
    { icon: "🟡", label: "Missing", value: `${tileStats.MISSING.qty.toLocaleString()} units`, sub: formatUSD(tileStats.MISSING.value), href: tileLink("MISSING"), active: mtype === "MISSING" },
    { icon: "🟢", label: "Returned", value: `${tileStats.RETURN.qty.toLocaleString()} units`, sub: formatUSD(tileStats.RETURN.value), href: tileLink("RETURN"), active: mtype === "RETURN" },
  ];

  // --- Main list ---
  let listContent: React.ReactNode;
  let totalPages = 1;

  if (view === "movements") {
    const where = {
      type: mtype || undefined,
      createdAt: { gte: new Date(fromStr + "T00:00:00"), lte: new Date(toStr + "T23:59:59") },
      ...(q ? { product: { name: { contains: q, mode: "insensitive" as const } } } : {}),
    };
    const [total, moves] = await Promise.all([
      db.stockMovement.count({ where }),
      db.stockMovement.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        include: { product: { select: { name: true } } },
      }),
    ]);
    totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    listContent = (
      <div className={tableWrapCls}>
        <table className={tableCls}>
          <thead>
            <tr>
              <th className={thCls}>Date</th>
              <th className={thCls}>Product</th>
              <th className={thCls}>Type</th>
              <th className={thCls}>Qty</th>
              <th className={thCls}>Reason</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {moves.map((m) => {
              const meta = TYPE_META[m.type] ?? { icon: "📦", tone: "zinc", label: m.type };
              return (
                <tr key={m.id} className="hover:bg-zinc-50">
                  <td className={tdCls}>{fmtDate(m.createdAt)}</td>
                  <td className={tdCls}>
                    <Link href={`/admin/products/${m.productId}`} className="font-medium text-zinc-900 hover:text-orange-700 hover:underline">
                      {m.product.name}
                    </Link>
                  </td>
                  <td className={tdCls}>
                    <Badge tone={meta.tone as never}>{meta.icon} {meta.label}</Badge>
                  </td>
                  <td className={tdCls}>
                    <span className={`font-extrabold ${m.qty < 0 ? "text-red-600" : "text-green-600"}`}>
                      {m.qty > 0 ? "+" : ""}{m.qty}
                    </span>
                  </td>
                  <td className={tdCls}>{m.reason || <span className="text-zinc-400">—</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {moves.length === 0 && (
          <p className="px-4 py-10 text-center text-sm text-zinc-400">No movements in this period.</p>
        )}
      </div>
    );
  } else {
  // Sortable header cell for the stock table: toggles asc/desc on click.
  const SortTh = ({ label, sortKey }: { label: string; sortKey: SortKey }) => {
    const active = sort === sortKey;
    const p = new URLSearchParams(baseParams);
    p.set("view", "stock");
    p.set("sort", sortKey);
    p.set("dir", active && dir === "asc" ? "desc" : "asc");
    return (
      <th className={thCls}>
        <Link href={`/admin/inventory?${p.toString()}`} className="inline-flex items-center gap-1 transition hover:text-zinc-900">
          {label}
          {active && <span className="text-[10px] text-orange-600">{dir === "asc" ? "▲" : "▼"}</span>}
        </Link>
      </th>
    );
  };

  const stockWhere = {
    ...(q ? { name: { contains: q, mode: "insensitive" as const } } : {}),
    ...(cat ? { categoryId: cat } : {}),
    ...(stockFilter === "out" ? { stock: 0 } : {}),
    ...(stockFilter === "low" ? { stock: { gt: 0, lt: 10 } } : {}),
    ...(stockFilter === "in" ? { stock: { gte: 10 } } : {}),
  };
  const stockInclude = { category: { select: { name: true } }, variants: { select: { id: true } } } as const;
  let stockTotal = 0;
  let stockProducts: { id: string; name: string; priceCents: number; stock: number; category: { name: string }; variants: { id: string }[] }[] = [];
  if (sort === "value") {
    // Value is computed (stock × priceCents), so sort in JS after fetching.
    const all = await db.product.findMany({ where: stockWhere, include: stockInclude });
    const mul = dir === "desc" ? -1 : 1;
    all.sort((a, b) => mul * (a.stock * a.priceCents - b.stock * b.priceCents));
    stockTotal = all.length;
    stockProducts = all.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  } else {
    const orderBy = sort === "price" ? { priceCents: dir } : sort === "stock" ? { stock: dir } : { name: dir };
    const [total, products] = await Promise.all([
      db.product.count({ where: stockWhere }),
      db.product.findMany({
        where: stockWhere,
        include: stockInclude,
        orderBy,
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
    ]);
    stockTotal = total;
    stockProducts = products;
  }
  totalPages = Math.max(1, Math.ceil(stockTotal / PAGE_SIZE));
  const filteringActive = Boolean(q || cat || stockFilter || sortActive);
  listContent = (
    <div>
      {filteringActive && (
        <p className="mb-2 text-xs font-semibold text-zinc-500">
          Showing {stockProducts.length} of {stockTotal.toLocaleString()} products
        </p>
      )}
      <div className={tableWrapCls}>
        <table className={tableCls}>
          <thead>
            <tr>
              <SortTh label="Product" sortKey="name" />
              <th className={thCls}>Category</th>
              <SortTh label="Price" sortKey="price" />
              <SortTh label="Stock" sortKey="stock" />
              <SortTh label="Value" sortKey="value" />
              <th className={thCls}>Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {stockProducts.map((p) => (
              <tr key={p.id} className="hover:bg-zinc-50">
                <td className={tdCls}>
                  <Link href={`/admin/products/${p.id}`} className="font-medium text-zinc-900 hover:text-orange-700 hover:underline">
                    {p.name}
                  </Link>
                  {p.variants.length > 0 && (
                    <span className="ml-2 text-xs text-zinc-400">{p.variants.length} variants</span>
                  )}
                </td>
                <td className={tdCls}>{p.category.name}</td>
                <td className={tdCls}>{formatUSD(p.priceCents)}</td>
                <td className={tdCls}>
                  <Badge tone={p.stock === 0 ? "red" : p.stock < 10 ? "amber" : "green"}>{p.stock}</Badge>
                </td>
                <td className={tdCls}>{formatUSD(p.stock * p.priceCents)}</td>
                <td className={tdCls}>
                  <AdjustStockModal productId={p.id} productName={p.name} currentStock={p.stock} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {stockProducts.length === 0 && (
          <p className="px-4 py-10 text-center text-sm text-zinc-400">No products found.</p>
        )}
      </div>
    </div>
  );
  }

  const pageHref = (pg: number) => {
    const p = new URLSearchParams(baseParams);
    p.set("view", view);
    if (mtype) p.set("mtype", mtype);
    p.set("page", String(pg));
    return `/admin/inventory?${p.toString()}`;
  };
  const viewHref = (v: string) => {
    const p = new URLSearchParams(baseParams);
    p.set("view", v);
    return `/admin/inventory?${p.toString()}`;
  };

  const pageNums: number[] = [];
  for (let i = Math.max(1, page - 2); i <= Math.min(totalPages, page + 2); i++) pageNums.push(i);

  return (
    <div>
      <SectionTitle title="Inventory" />

      {/* Tiles */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {tiles.map((t) => {
          const inner = (
            <div className={`h-full rounded-3xl bg-white p-4 shadow-sm ring-1 transition ${
              t.active ? "ring-2 ring-orange-500" : "ring-zinc-100 hover:shadow-md"
            }`}>
              <span className="text-xl">{t.icon}</span>
              <p className="mt-2 text-lg font-extrabold text-zinc-900">{t.value}</p>
              <p className="text-xs font-medium text-zinc-500">{t.label}</p>
              {t.sub && <p className="text-xs font-bold text-zinc-700">{t.sub}</p>}
            </div>
          );
          return t.href ? (
            <Link key={t.label} href={t.href} className="block h-full">{inner}</Link>
          ) : (
            <div key={t.label} className="h-full">{inner}</div>
          );
        })}
      </div>

      {/* Filters */}
      <form action="/admin/inventory" method="get" className={`${cardCls} mb-4 flex flex-wrap items-end gap-2 p-4`}>
        <input type="hidden" name="view" value={view} />
        {mtype && <input type="hidden" name="mtype" value={mtype} />}
        <label className="min-w-40 flex-1">
          <span className="mb-1 block text-xs font-bold text-zinc-500">Search</span>
          <input name="q" defaultValue={q} placeholder="Product name…" className={inputCls} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-bold text-zinc-500">Category</span>
          <select name="cat" defaultValue={cat} className={inputCls}>
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>
        {view === "stock" && (
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-zinc-500">Stock status</span>
            <select name="stock" defaultValue={stockFilter} className={inputCls}>
              <option value="">All stock levels</option>
              <option value="out">🔴 Out of stock</option>
              <option value="low">🟡 Low stock</option>
              <option value="in">🟢 In stock</option>
            </select>
          </label>
        )}
        {view === "stock" && sortActive && (
          <>
            <input type="hidden" name="sort" value={sort} />
            <input type="hidden" name="dir" value={dir} />
          </>
        )}
        <label className="block">
          <span className="mb-1 block text-xs font-bold text-zinc-500">From</span>
          <input type="date" name="from" defaultValue={fromStr} max={toStr} className={inputCls} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-bold text-zinc-500">To</span>
          <input type="date" name="to" defaultValue={toStr} min={fromStr} max={isoDay(new Date())} className={inputCls} />
        </label>
        <button type="submit" className={btnPrimary}>Apply</button>
        {(q || cat || mtype || stockFilter || sortActive) && (
          <Link href={view === "movements" ? "/admin/inventory?view=movements" : "/admin/inventory"} className="px-2 py-2 text-sm font-bold text-zinc-500 hover:text-zinc-800">
            Clear
          </Link>
        )}
      </form>

      {/* View toggle */}
      <div className="mb-4 flex flex-wrap gap-2">
        {[
          { id: "stock", label: "📦 Stock list" },
          { id: "movements", label: "📝 Movements" },
        ].map((v) => (
          <Link
            key={v.id}
            href={viewHref(v.id)}
            className={`rounded-full px-4 py-1.5 text-sm font-bold transition ${
              view === v.id ? "bg-zinc-900 text-white shadow" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
            }`}
          >
            {v.label}
          </Link>
        ))}
        {mtype && view === "movements" && (
          <span className="inline-flex items-center rounded-full bg-orange-100 px-3 py-1.5 text-xs font-bold text-orange-800">
            {TYPE_META[mtype]?.icon} {TYPE_META[mtype]?.label}
            <Link href={viewHref("movements")} className="ml-2 font-extrabold hover:text-orange-900">✕</Link>
          </span>
        )}
      </div>

      {listContent}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-1.5">
          {page > 1 && (
            <Link href={pageHref(page - 1)} className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-bold text-zinc-600 hover:bg-zinc-50">
              ←
            </Link>
          )}
          {pageNums[0] > 1 && (
            <>
              <Link href={pageHref(1)} className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-bold text-zinc-600 hover:bg-zinc-50">1</Link>
              {pageNums[0] > 2 && <span className="text-zinc-400">…</span>}
            </>
          )}
          {pageNums.map((n) => (
            <Link
              key={n}
              href={pageHref(n)}
              className={`rounded-lg px-3 py-1.5 text-sm font-bold ${
                n === page
                  ? "bg-zinc-900 text-white shadow"
                  : "border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
              }`}
            >
              {n}
            </Link>
          ))}
          {pageNums[pageNums.length - 1] < totalPages && (
            <>
              {pageNums[pageNums.length - 1] < totalPages - 1 && <span className="text-zinc-400">…</span>}
              <Link href={pageHref(totalPages)} className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-bold text-zinc-600 hover:bg-zinc-50">{totalPages}</Link>
            </>
          )}
          {page < totalPages && (
            <Link href={pageHref(page + 1)} className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-bold text-zinc-600 hover:bg-zinc-50">
              →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
