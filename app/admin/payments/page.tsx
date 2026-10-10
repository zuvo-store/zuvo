export const dynamic = "force-dynamic";
import Link from "next/link";
import { db } from "@/lib/db";
import { formatUSD } from "@/lib/money";
import { getSessionUser, requireAdminPage} from "@/lib/auth";
import { DemoPaymentProvider, SCENARIO_LABELS } from "@/lib/payments";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Badge, FormError, SectionTitle } from "@/components/ui";
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

  const [total, payments] = await Promise.all([
    db.payment.count(),
    db.payment.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { order: { select: { id: true, orderNumber: true } } },
    }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <SectionTitle title="Payments" />
      <p className="mb-4 text-sm text-zinc-500">
        {total} payment{total === 1 ? "" : "s"} — demo provider only.
      </p>
      <FormError message={qp(sp, "error")} />

      <div className={tableWrapCls}>
        <table className={tableCls}>
          <thead>
            <tr>
              <th className={thCls}>Transaction ref</th>
              <th className={thCls}>Order</th>
              <th className={thCls}>Scenario</th>
              <th className={thCls}>Status</th>
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
                <td className={tdCls}>{formatUSD(p.amountCents)}</td>
                <td className={tdCls}>{fmtDate(p.createdAt)}</td>
                <td className={tdCls}>
                  {p.status === "SUCCEEDED" ? (
                    <form action={refundPayment} className="inline">
                      <input type="hidden" name="orderId" value={p.order.id} />
                      <button type="submit" className={`${btnDanger} ${btnSm}`}>
                        Refund
                      </button>
                    </form>
                  ) : (
                    <span className="text-xs text-zinc-400">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={totalPages} basePath="/admin/payments" />
    </div>
  );
}
