export const dynamic = "force-dynamic";
import Link from "next/link";
import { db } from "@/lib/db";
import { Badge, SectionTitle } from "@/components/ui";
import EmptyState from "@/components/EmptyState";
import Pagination from "@/components/Pagination";
import { qp, pageNumber, fmtDate, tableWrapCls, tableCls, thCls, tdCls, type SearchParams } from "../_helpers";
import { requireAdminPage } from "@/lib/auth";

const PAGE_SIZE = 25;

export default async function AdminCustomersPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdminPage(); // must run before any data fetch (see lib/auth.ts)
  const sp = await searchParams;
  const q = (qp(sp, "q") ?? "").trim();
  const page = pageNumber(sp);

  const where = q
    ? { OR: [{ name: { contains: q } }, { email: { contains: q } }, { username: { contains: q } }] }
    : {};

  const [total, customers] = await Promise.all([
    db.user.count({ where }),
    db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { _count: { select: { orders: true, rewards: true } } },
    }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <SectionTitle title="Customers" />
      <p className="mb-4 text-sm text-zinc-500">
        {total} account{total === 1 ? "" : "s"}
      </p>

      <form method="get" className="mb-4 flex gap-2">
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
        {q ? (
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
