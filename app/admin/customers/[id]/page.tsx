export const dynamic = "force-dynamic";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatUSD } from "@/lib/money";
import { btnSecondary, cardCls, Badge, SectionTitle } from "@/components/ui";
import { fmtDate, statusTone, tableWrapCls, tableCls, thCls, tdCls } from "../../_helpers";
import { requireAdminPage } from "@/lib/auth";

export default async function AdminCustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage(); // must run before any data fetch (see lib/auth.ts)
  const { id } = await params;
  const user = await db.user.findUnique({
    where: { id },
    include: {
      addresses: { orderBy: { createdAt: "asc" } },
      orders: { orderBy: { createdAt: "desc" }, take: 10, include: { _count: { select: { items: true } } } },
      rewards: { include: { campaign: { select: { name: true } } }, orderBy: { createdAt: "desc" } },
      referralsMadeByMe: {
        include: { referred: { select: { name: true, email: true, createdAt: true } } },
        orderBy: { createdAt: "desc" },
      },
      referredBy: { select: { name: true, email: true } },
    },
  });
  if (!user) notFound();

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <SectionTitle title={user.name} className="mb-0" />
        <Link href="/admin/customers" className={btnSecondary}>
          Back to customers
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className={`${cardCls} p-5`}>
          <h2 className="mb-3 text-base font-bold text-zinc-900">Account info</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-zinc-500">Username</dt><dd className="font-medium">{user.username}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-zinc-500">Email</dt><dd className="font-medium">{user.email}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-zinc-500">Role</dt><dd><Badge tone={user.role === "ADMIN" ? "brand" : "zinc"}>{user.role}</Badge></dd></div>
            <div className="flex justify-between gap-4"><dt className="text-zinc-500">Email verified</dt><dd><Badge tone={user.emailVerified ? "green" : "amber"}>{user.emailVerified ? "yes" : "no"}</Badge></dd></div>
            <div className="flex justify-between gap-4"><dt className="text-zinc-500">Referral code</dt><dd className="font-mono">{user.referralCode}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-zinc-500">Referred by</dt><dd>{user.referredBy ? `${user.referredBy.name} (${user.referredBy.email})` : "—"}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-zinc-500">Joined</dt><dd>{fmtDate(user.createdAt)}</dd></div>
          </dl>

          <h3 className="mb-2 mt-6 text-sm font-bold text-zinc-900">Addresses ({user.addresses.length})</h3>
          {user.addresses.length === 0 ? (
            <p className="text-sm text-zinc-500">No saved addresses.</p>
          ) : (
            <ul className="space-y-2">
              {user.addresses.map((a) => (
                <li key={a.id} className="rounded-lg border border-zinc-200 p-3 text-sm">
                  <span className="font-medium">{a.label}</span>
                  {a.isDefault ? <Badge tone="brand" className="ml-2">default</Badge> : null}
                  <span className="block text-zinc-600">
                    {a.fullName} — {a.street}{a.apartment ? `, ${a.apartment}` : ""}, {a.city}, {a.state} {a.postalCode}, {a.country}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={`${cardCls} p-5`}>
          <h2 className="mb-3 text-base font-bold text-zinc-900">Rewards ({user.rewards.length})</h2>
          {user.rewards.length === 0 ? (
            <p className="text-sm text-zinc-500">No rewards.</p>
          ) : (
            <div className={tableWrapCls}>
              <table className={tableCls}>
                <thead>
                  <tr>
                    <th className={thCls}>Campaign</th>
                    <th className={thCls}>Amount</th>
                    <th className={thCls}>Status</th>
                    <th className={thCls}>Claimed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {user.rewards.map((r) => (
                    <tr key={r.id}>
                      <td className={tdCls}>{r.campaign.name}</td>
                      <td className={tdCls}>{formatUSD(r.amountCents)}</td>
                      <td className={tdCls}><Badge tone={statusTone(r.status)}>{r.status}</Badge></td>
                      <td className={tdCls}>{fmtDate(r.claimedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <h2 className="mb-3 mt-6 text-base font-bold text-zinc-900">
            Referrals made ({user.referralsMadeByMe.length})
          </h2>
          {user.referralsMadeByMe.length === 0 ? (
            <p className="text-sm text-zinc-500">No referrals attributed.</p>
          ) : (
            <div className={tableWrapCls}>
              <table className={tableCls}>
                <thead>
                  <tr>
                    <th className={thCls}>Referred</th>
                    <th className={thCls}>Code</th>
                    <th className={thCls}>Status</th>
                    <th className={thCls}>Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {user.referralsMadeByMe.map((a) => (
                    <tr key={a.id}>
                      <td className={tdCls}>
                        {a.referred.name}
                        <span className="block text-xs text-zinc-500">{a.referred.email}</span>
                      </td>
                      <td className={tdCls}><span className="font-mono text-xs">{a.code}</span></td>
                      <td className={tdCls}><Badge tone={statusTone(a.status)}>{a.status}</Badge></td>
                      <td className={tdCls}>{fmtDate(a.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <h2 className="mb-3 mt-8 text-lg font-bold text-zinc-900">Recent orders</h2>
      {user.orders.length === 0 ? (
        <p className="text-sm text-zinc-500">No orders yet.</p>
      ) : (
        <div className={tableWrapCls}>
          <table className={tableCls}>
            <thead>
              <tr>
                <th className={thCls}>Order</th>
                <th className={thCls}>Items</th>
                <th className={thCls}>Total</th>
                <th className={thCls}>Payment</th>
                <th className={thCls}>Status</th>
                <th className={thCls}>Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {user.orders.map((o) => (
                <tr key={o.id} className="hover:bg-zinc-50">
                  <td className={tdCls}>
                    <Link href={`/admin/orders/${o.id}`} className="font-medium text-orange-700 hover:underline">
                      {o.orderNumber}
                    </Link>
                  </td>
                  <td className={tdCls}>{o._count.items}</td>
                  <td className={tdCls}>{formatUSD(o.totalCents)}</td>
                  <td className={tdCls}><Badge tone={statusTone(o.paymentStatus)}>{o.paymentStatus}</Badge></td>
                  <td className={tdCls}><Badge tone={statusTone(o.status)}>{o.status}</Badge></td>
                  <td className={tdCls}>{fmtDate(o.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
