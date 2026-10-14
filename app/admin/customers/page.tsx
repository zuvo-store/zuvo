export const dynamic = "force-dynamic";
import Link from "next/link";
import { db } from "@/lib/db";
import { Badge, SectionTitle } from "@/components/ui";
import EmptyState from "@/components/EmptyState";
import Pagination from "@/components/Pagination";
import { qp, pageNumber, fmtDate, tableWrapCls, tableCls, thCls, tdCls, type SearchParams } from "../_helpers";
import { requireAdminPage } from "@/lib/auth";

const PAGE_SIZE = 25;

type ViewFilter = "verified" | "unverified" | "buyers" | "";

function viewFilterOf(raw: string | undefined): ViewFilter {
  return raw === "verified" || raw === "unverified" || raw === "buyers" ? raw : "";
}

export default async function AdminCustomersPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdminPage(); // must run before any data fetch (see lib/auth.ts)
  const sp = await searchParams;
  const q = (qp(sp, "q") ?? "").trim();
  const v = viewFilterOf(qp(sp, "v"));
  const page = pageNumber(sp);

  const searchWhere = q
    ? { OR: [{ name: { contains: q } }, { email: { contains: q } }, { username: { contains: q } }] }
    : {};
  const viewWhere =
    v === "verified"
      ? { emailVerified: { not: null } }
      : v === "unverified"
        ? { emailVerified: null }
        : v === "buyers"
          ? { orders: { some: {} } }
          : {};
  const where = { AND: [searchWhere, viewWhere] };

  const [total, totalAll, verifiedCount, unverifiedCount, buyersCount, customers] = await Promise.all([
    db.user.count({ where }),
    db.user.count(),
    db.user.count({ where: { emailVerified: { not: null } } }),
    db.user.count({ where: { emailVerified: null } }),
    db.user.count({ where: { orders: { some: {} } } }),
    db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { _count: { select: { orders: true, rewards: true } } },
    }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const tileHref = (target: ViewFilter) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    // Clicking the active card clears the filter (toggle).
    if (target && target !== v) p.set("v", target);
    const qs = p.toString();
    return qs ? `/admin/customers?${qs}` : "/admin/customers";
  };

  const tiles = [
    { icon: "👥", label: "Total customers", value: String(totalAll), href: tileHref(""), active: v === "" },
    { icon: "✅", label: "Verified", value: String(verifiedCount), href: tileHref("verified"), active: v === "verified" },
    { icon: "⏳", label: "Unverified", value: String(unverifiedCount), href: tileHref("unverified"), active: v === "unverified" },
    { icon: "🛒", label: "With orders", value: String(buyersCount), href: tileHref("buyers"), active: v === "buyers" },
  ];

  const filtered = q || v;

  return (
    <div>
      <SectionTitle title="Customers" />

      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((t) => {
          const inner = (
            <div className={`h-full rounded-3xl bg-white p-4 shadow-sm ring-1 transition ${
              t.active ? "ring-2 ring-orange-500" : "ring-zinc-100 hover:shadow-md"
            }`}>
              <span className="text-xl">{t.icon}</span>
              <p className="mt-2 text-lg font-extrabold text-zinc-900">{t.value}</p>
              <p className="text-xs font-medium text-zinc-500">{t.label}</p>
            </div>
          );
          return (
            <Link key={t.label} href={t.href} className="block h-full">
              {inner}
            </Link>
          );
        })}
      </div>

      <p className="mb-4 text-sm text-zinc-500">
        {total} account{total === 1 ? "" : "s"}
        {filtered ? " matching filters" : ""}
      </p>

      <form method="get" className="mb-4 flex gap-2">
        {v ? <input type="hidden" name="v" value={v} /> : null}
        <input
          name="q"
          defaultValue={q}
          placeholder="Search name, username, email…"
          className="block w-full max-w-sm rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-sm shadow-sm focus:border-orange-600 focus:outline-none"
        />
        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-xl border border-zinc-300 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-700 shadow-sm hover:bg-zinc-50"
        >
          Search
        </button>
        {filtered ? (
          <Link
            href="/admin/customers"
            className="inline-flex items-center justify-center rounded-xl border border-zinc-300 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-700 shadow-sm hover:bg-zinc-50"
          >
            Clear
          </Link>
        ) : null}
      </form>

      {customers.length === 0 ? (
        <EmptyState title="No customers" message="No accounts match this search." />
      ) : (
        <div className={tableWrapCls}>
          <table className={tableCls}>
            <thead>
              <tr>
                <th className={thCls}>Name</th>
                <th className={thCls}>Username</th>
                <th className={thCls}>Email</th>
                <th className={thCls}>Role</th>
                <th className={thCls}>Verified</th>
                <th className={thCls}>Orders</th>
                <th className={thCls}>Rewards</th>
                <th className={thCls}>Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {customers.map((u) => (
                <tr key={u.id} className="hover:bg-zinc-50">
                  <td className={tdCls}>
                    <Link href={`/admin/customers/${u.id}`} className="font-medium text-orange-700 hover:underline">
                      {u.name}
                    </Link>
                  </td>
                  <td className={tdCls}>{u.username}</td>
                  <td className={tdCls}>{u.email}</td>
                  <td className={tdCls}>
                    <Badge tone={u.role === "ADMIN" ? "brand" : "zinc"}>{u.role}</Badge>
                  </td>
                  <td className={tdCls}>
                    <Badge tone={u.emailVerified ? "green" : "amber"}>
                      {u.emailVerified ? "yes" : "no"}
                    </Badge>
                  </td>
                  <td className={tdCls}>{u._count.orders}</td>
                  <td className={tdCls}>{u._count.rewards}</td>
                  <td className={tdCls}>{fmtDate(u.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} basePath="/admin/customers" />
    </div>
  );
}
