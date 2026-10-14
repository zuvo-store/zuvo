export const dynamic = "force-dynamic";
import Link from "next/link";
import ConfirmForm from "@/components/ConfirmForm";
import { db } from "@/lib/db";
import { formatUSD } from "@/lib/money";
import { getSessionUser, requireAdminPage} from "@/lib/auth";
import { DemoPaymentProvider, SCENARIO_LABELS } from "@/lib/payments";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Badge, FormError, SectionTitle, cardCls } from "@/components/ui";
import Pagination from "@/components/Pagination";
import { qp, pageNumber, fmtDate, statusTone, tableWrapCls, tableCls, thCls, tdCls, btnDanger, btnSm, type SearchParams } from "../_helpers";

const PAGE_SIZE = 25;

async function refundPayment(formData: FormData) {
  "use server";
  const me = await getSessionUser();
  const orderId = String(formData.get("orderId") ?? "");
  const outcome = await (async () => {
    try {
      await DemoPaymentProvider.refundDemoPayment(orderId, me?.id);
      return { ok: true as const };
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : "Refund failed." };
    }
  })();
  if (!outcome.ok) redirect("/admin/payments?error=" + encodeURIComponent(outcome.error));
  revalidatePath("/admin/payments");
}

export default async function AdminPaymentsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdminPage(); // must run before any data fetch (see lib/auth.ts)
  const sp = await searchParams;
  const page = pageNumber(sp);

  const VALID_STATUSES = ["SUCCEEDED", "REFUNDED", "PENDING"] as const;
  const VALID_PROVIDERS = ["stripe", "demo", "cod"] as const;
  const rawFstatus = qp(sp, "fstatus") ?? "";
  const rawFprovider = qp(sp, "fprovider") ?? "";
  const fstatus = (VALID_STATUSES as readonly string[]).includes(rawFstatus) ? rawFstatus : "";
  const fprovider = (VALID_PROVIDERS as readonly string[]).includes(rawFprovider) ? rawFprovider : "";

  const where = {
    ...(fstatus ? { status: fstatus } : {}),
    ...(fprovider ? { provider: fprovider } : {}),
  };

  const [grandTotal, total, payments, statusGroups, providerGroups] = await Promise.all([
    db.payment.count(),
    db.payment.count({ where }),
    db.payment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { order: { select: { id: true, orderNumber: true, status: true } } },
    }),
    db.payment.groupBy({ by: ["status"], _count: { _all: true }, _sum: { amountCents: true } }),
    db.payment.groupBy({ by: ["provider"], _count: { _all: true }, _sum: { amountCents: true } }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const statusAgg: Record<string, { count: number; sum: number }> = {};
  for (const g of statusGroups) statusAgg[g.status] = { count: g._count._all, sum: g._sum.amountCents ?? 0 };
  const providerAgg: Record<string, { count: number; sum: number }> = {};
  for (const g of providerGroups) providerAgg[g.provider] = { count: g._count._all, sum: g._sum.amountCents ?? 0 };

  // Card href: toggle the filter off when clicking the active card, preserve the other filter.
  const cardHref = (kind: "fstatus" | "fprovider", value: string) => {
    const cur = kind === "fstatus" ? fstatus : fprovider;
    const otherKind = kind === "fstatus" ? "fprovider" : "fstatus";
    const other = kind === "fstatus" ? fprovider : fstatus;
    const p = new URLSearchParams();
    if (cur !== value) p.set(kind, value); // clicking inactive card sets it; active card toggles off
    if (other) p.set(otherKind, other);
    const qs = p.toString();
    return qs ? `/admin/payments?${qs}` : "/admin/payments";
  };

  const agg = (map: Record<string, { count: number; sum: number }>, key: string) =>
    map[key] ?? { count: 0, sum: 0 };
  const cards = [
    { icon: "✅", label: "Succeeded", ...agg(statusAgg, "SUCCEEDED"), kind: "fstatus" as const, val: "SUCCEEDED", active: fstatus === "SUCCEEDED" },
    { icon: "↩️", label: "Refunded", ...agg(statusAgg, "REFUNDED"), kind: "fstatus" as const, val: "REFUNDED", active: fstatus === "REFUNDED" },
    { icon: "⏳", label: "Pending", ...agg(statusAgg, "PENDING"), kind: "fstatus" as const, val: "PENDING", active: fstatus === "PENDING" },
    { icon: "💳", label: "Stripe", ...agg(providerAgg, "stripe"), kind: "fprovider" as const, val: "stripe", active: fprovider === "stripe" },
    { icon: "🎭", label: "Demo", ...agg(providerAgg, "demo"), kind: "fprovider" as const, val: "demo", active: fprovider === "demo" },
    { icon: "💵", label: "COD", ...agg(providerAgg, "cod"), kind: "fprovider" as const, val: "cod", active: fprovider === "cod" },
  ];

  const filterDesc = [
    fstatus ? `status: ${fstatus}` : null,
    fprovider ? `provider: ${fprovider}` : null,
  ].filter(Boolean).join(", ");

  return (
    <div>
      <SectionTitle title="Payments" />
      <p className="mb-4 text-sm text-zinc-500">
        {total} payment{total === 1 ? "" : "s"}
        {filterDesc ? ` — ${filterDesc}` : ""}
        {(fstatus || fprovider) && (
          <Link href="/admin/payments" className="ml-2 font-bold text-orange-700 hover:underline">
            Clear filters ✕
          </Link>
        )}
      </p>
      <FormError message={qp(sp, "error")} />

      {grandTotal > 0 && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {cards.map((c) => {
            const inner = (
              <div className={`h-full rounded-3xl bg-white p-4 shadow-sm ring-1 transition ${
                c.active ? "ring-2 ring-orange-500" : "ring-zinc-100 hover:shadow-md"
              }`}>
                <span className="text-xl">{c.icon}</span>
                <p className="mt-2 text-lg font-extrabold text-zinc-900">
                  {c.count.toLocaleString()}
                </p>
                <p className="text-xs font-medium text-zinc-500">{c.label}</p>
                <p className="text-xs font-bold text-zinc-700">{formatUSD(c.sum)}</p>
              </div>
            );
            return (
              <Link key={c.label} href={cardHref(c.kind, c.val)} className="block h-full" scroll={false}>
                {inner}
              </Link>
            );
          })}
        </div>
      )}

      {total === 0 ? (
        grandTotal === 0 ? (
        <div className={cardCls + " p-10 text-center"}>
          <p className="text-4xl">💳</p>
          <p className="mt-2 text-lg font-bold text-zinc-900">No payments yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-zinc-500">
            Payments appear here once customers complete checkout.
          </p>
          <Link href="/admin/orders" className="mt-4 inline-block rounded-full bg-zinc-900 px-6 py-2 text-sm font-bold text-white hover:bg-zinc-700">
            View orders →
          </Link>
        </div>
        ) : (
        <div className={cardCls + " p-10 text-center"}>
          <p className="text-4xl">🔍</p>
          <p className="mt-2 text-lg font-bold text-zinc-900">No payments match these filters</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-zinc-500">
            Try a different status or provider combination.
          </p>
          <Link href="/admin/payments" className="mt-4 inline-block rounded-full bg-zinc-900 px-6 py-2 text-sm font-bold text-white hover:bg-zinc-700">
            Clear filters
          </Link>
        </div>
        )
      ) : (
      <div className={tableWrapCls}>
        <table className={tableCls}>
          <thead>
            <tr>
              <th className={thCls}>Transaction ref</th>
              <th className={thCls}>Order</th>
              <th className={thCls}>Scenario</th>
              <th className={thCls}>Payment status</th>
              <th className={thCls}>Order status</th>
              <th className={thCls}>Amount</th>
              <th className={thCls}>Date</th>
              <th className={thCls}>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {payments.map((p) => (
              <tr key={p.id} className="hover:bg-zinc-50">
                <td className={tdCls}><span className="font-mono text-xs">{p.transactionRef ?? "—"}</span></td>
                <td className={tdCls}>
                  <Link href={`/admin/orders/${p.order.id}`} className="font-medium text-orange-700 hover:underline">
                    {p.order.orderNumber}
                  </Link>
                </td>
                <td className={tdCls}>{SCENARIO_LABELS[p.scenario as keyof typeof SCENARIO_LABELS] ?? p.scenario}</td>
                <td className={tdCls}>
                  <Badge tone={statusTone(p.status)}>{p.status}</Badge>
                </td>
                <td className={tdCls}>
                  <Badge tone={statusTone(p.order.status)}>{p.order.status.replace(/_/g, " ")}</Badge>
                  {["CANCELLED", "REFUNDED"].includes(p.order.status) && p.status === "SUCCEEDED" && (
                    <span className="mt-1 block text-[11px] font-bold text-red-600">⚠️ Refund needed</span>
                  )}
                </td>
                <td className={tdCls}>{formatUSD(p.amountCents)}</td>
                <td className={tdCls}>{fmtDate(p.createdAt)}</td>
                <td className={tdCls}>
                  {p.status === "SUCCEEDED" ? (
                    <ConfirmForm
                      action={refundPayment}
                      className="inline"
                      title={`Refund ${formatUSD(p.amountCents)}?`}
                      message={`Refund the payment for order ${p.order.orderNumber}? The customer will be notified and inventory restored.`}
                      confirmLabel="Yes, refund"
                      danger
                    >
                      <input type="hidden" name="orderId" value={p.order.id} />
                      <button type="submit" className={`${btnDanger} ${btnSm}`}>
                        Refund
                      </button>
                    </ConfirmForm>
                  ) : (
                    <span className="text-xs text-zinc-400">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}

      {total > 0 && <Pagination page={page} totalPages={totalPages} basePath="/admin/payments" />}
    </div>
  );
}
