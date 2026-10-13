export const dynamic = "force-dynamic";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { formatUSD } from "@/lib/money";
import { getSessionUser, requireAdminPage} from "@/lib/auth";
import { VALID_TRANSITIONS, transitionOrder } from "@/lib/checkout";
import { DemoPaymentProvider, confirmPendingDemoPayment, SCENARIO_LABELS } from "@/lib/payments";
import { revalidatePath } from "next/cache";
import {
  btnPrimary,
  btnSecondary,
  cardCls,
  Badge,
  FormError,
  SectionTitle,
} from "@/components/ui";
import { fmtDate, statusTone, tableWrapCls, tableCls, thCls, tdCls, btnDanger, btnSm, qp, type SearchParams } from "../../_helpers";

export default async function AdminOrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: SearchParams;
}) {
  await requireAdminPage(); // must run before any data fetch (see lib/auth.ts)
  const { id } = await params;
  const sp = await searchParams;

  const order = await db.order.findUnique({
    where: { id },
    include: {
      items: true,
      payments: { orderBy: { createdAt: "desc" } },
      user: { select: { id: true, name: true, email: true, username: true } },
    },
  });
  if (!order) notFound();

  const nextStatuses = VALID_TRANSITIONS[order.status] ?? [];
  const hasSucceeded = order.payments.some((p) => p.status === "SUCCEEDED");
  const hasPending = order.payments.some((p) => p.status === "PENDING");

  async function transition(formData: FormData) {
    "use server";
    const me = await getSessionUser();
    const to = String(formData.get("to") ?? "");
    const outcome = await (async () => {
      try {
        await transitionOrder(id, to, me?.id, "Admin console");
        return { ok: true as const };
      } catch (e) {
        return { ok: false as const, error: e instanceof Error ? e.message : "Transition failed." };
      }
    })();
    if (!outcome.ok) redirect(`/admin/orders/${id}?error=` + encodeURIComponent(outcome.error));
    revalidatePath(`/admin/orders/${id}`);
    revalidatePath("/admin/orders");
  }

  async function refund() {
    "use server";
    const me = await getSessionUser();
    const outcome = await (async () => {
      try {
        await DemoPaymentProvider.refundDemoPayment(id, me?.id);
        return { ok: true as const };
      } catch (e) {
        return { ok: false as const, error: e instanceof Error ? e.message : "Refund failed." };
      }
    })();
    if (!outcome.ok) redirect(`/admin/orders/${id}?error=` + encodeURIComponent(outcome.error));
    revalidatePath(`/admin/orders/${id}`);
  }

  async function confirmPending() {
    "use server";
    const me = await getSessionUser();
    const outcome = await (async () => {
      try {
        await confirmPendingDemoPayment(id, me?.id);
        return { ok: true as const };
      } catch (e) {
        return { ok: false as const, error: e instanceof Error ? e.message : "Confirmation failed." };
      }
    })();
    if (!outcome.ok) redirect(`/admin/orders/${id}?error=` + encodeURIComponent(outcome.error));
    revalidatePath(`/admin/orders/${id}`);
  }

  const contact = (order.contactJson as Record<string, string> | null) ?? null;
  const address = (order.addressJson as Record<string, string> | null) ?? null;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <SectionTitle title={order.orderNumber} className="mb-0" />
        <Link href="/admin/orders" className={btnSecondary}>
          Back to orders
        </Link>
      </div>
      <FormError message={qp(sp, "error")} />
      {qp(sp, "saved") ? (
        <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          Order updated.
        </div>
      ) : null}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge tone={statusTone(order.status)}>{order.status}</Badge>
        <span className="text-sm text-zinc-500">payment:</span>
        <Badge tone={statusTone(order.paymentStatus)}>{order.paymentStatus}</Badge>
        <span className="text-sm text-zinc-500">placed {fmtDate(order.createdAt)}</span>
      </div>

      {/* Actions */}
      <div className={`${cardCls} mb-6 p-5`}>
        <h2 className="mb-3 text-base font-bold text-zinc-900">Actions</h2>
        <div className="flex flex-wrap gap-2">
          {nextStatuses.length === 0 ? (
            <p className="text-sm text-zinc-500">No further status transitions available.</p>
          ) : (
            nextStatuses.map((to) => (
              <form key={to} action={transition} className="inline">
                <input type="hidden" name="to" value={to} />
                <button type="submit" className={`${btnPrimary} ${btnSm}`}>
                  Move to {to}
                </button>
              </form>
            ))
          )}
          {hasPending ? (
            <form action={confirmPending} className="inline">
              <button type="submit" className={`${btnSecondary} ${btnSm}`}>
                Confirm pending payment
              </button>
            </form>
          ) : null}
          {hasSucceeded ? (
            <form action={refund} className="inline">
              <button type="submit" className={`${btnDanger} ${btnSm}`}>
                Refund (demo)
              </button>
            </form>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Items */}
        <div className={`${cardCls} p-5`}>
          <h2 className="mb-3 text-base font-bold text-zinc-900">Items ({order.items.length})</h2>
          <div className={tableWrapCls}>
            <table className={tableCls}>
              <thead>
                <tr>
                  <th className={thCls}>Item</th>
                  <th className={thCls}>Qty</th>
                  <th className={thCls}>Unit</th>
                  <th className={thCls}>Line total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {order.items.map((it) => (
                  <tr key={it.id}>
                    <td className={tdCls}>
                      <span className="font-medium">{it.name}</span>
                      {it.variantLabel ? (
                        <span className="block text-xs text-zinc-500">{it.variantLabel}</span>
                      ) : null}
                    </td>
                    <td className={tdCls}>{it.qty}</td>
                    <td className={tdCls}>{formatUSD(it.unitPriceCents)}</td>
                    <td className={tdCls}>{formatUSD(it.lineTotalCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <dl className="mt-4 space-y-1 text-sm">
            <div className="flex justify-between"><dt className="text-zinc-500">Subtotal</dt><dd>{formatUSD(order.subtotalCents)}</dd></div>
            <div className="flex justify-between"><dt className="text-zinc-500">Discount{order.promoCode ? ` (${order.promoCode})` : ""}</dt><dd>−{formatUSD(order.discountCents)}</dd></div>
            <div className="flex justify-between"><dt className="text-zinc-500">Shipping{order.deliveryLabel ? ` (${order.deliveryLabel})` : ""}</dt><dd>{formatUSD(order.shippingCents)}</dd></div>
            <div className="flex justify-between"><dt className="text-zinc-500">Tax</dt><dd>{formatUSD(order.taxCents)}</dd></div>
            {order.giftWrap && (
              <div className="flex justify-between"><dt className="text-pink-600">🎁 Gift wrap</dt><dd>{formatUSD(order.giftWrapCents)}</dd></div>
            )}
            <div className="flex justify-between border-t border-zinc-200 pt-2 font-bold"><dt>Total</dt><dd>{formatUSD(order.totalCents)}</dd></div>
          </dl>
          {order.giftWrap && order.giftMessage && (
            <div className="mt-4 rounded-xl bg-pink-50 p-4 ring-1 ring-pink-100">
              <p className="text-sm font-bold text-pink-700">🎁 Gift message</p>
              <p className="mt-1 text-sm italic text-pink-800">“{order.giftMessage}”</p>
            </div>
          )}
        </div>

        {/* Contact / address */}
        <div className={`${cardCls} p-5`}>
          <h2 className="mb-3 text-base font-bold text-zinc-900">Customer</h2>
          {order.user ? (
            <p className="text-sm">
              <Link href={`/admin/customers/${order.user.id}`} className="font-medium text-orange-700 hover:underline">
                {order.user.name}
              </Link>
              <span className="block text-zinc-500">{order.user.email}</span>
            </p>
          ) : (
            <p className="text-sm text-zinc-600">
              {contact?.name ?? order.guestName ?? "Guest"}
              <span className="block text-zinc-500">{contact?.email ?? order.guestEmail ?? ""}</span>
            </p>
          )}
          {contact?.phone ? <p className="mt-1 text-sm text-zinc-600">{contact.phone}</p> : null}

          <h3 className="mb-2 mt-5 text-sm font-bold text-zinc-900">Shipping address</h3>
          {address ? (
            <address className="text-sm not-italic leading-relaxed text-zinc-600">
              {address.fullName ? <span className="block font-medium text-zinc-800">{address.fullName}</span> : null}
              <span className="block">{address.street}{address.apartment ? `, ${address.apartment}` : ""}</span>
              <span className="block">{address.city}, {address.state} {address.postalCode}</span>
              <span className="block">{address.country}</span>
              {address.phone ? <span className="block">{address.phone}</span> : null}
            </address>
          ) : (
            <p className="text-sm text-zinc-500">No address snapshot.</p>
          )}
        </div>
      </div>

      {/* Payments */}
      <h2 className="mb-3 mt-8 text-lg font-bold text-zinc-900">Payments</h2>
      {order.payments.length === 0 ? (
        <p className="text-sm text-zinc-500">No payments recorded.</p>
      ) : (
        <div className={tableWrapCls}>
          <table className={tableCls}>
            <thead>
              <tr>
                <th className={thCls}>Transaction ref</th>
                <th className={thCls}>Scenario</th>
                <th className={thCls}>Status</th>
                <th className={thCls}>Amount</th>
                <th className={thCls}>Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {order.payments.map((p) => (
                <tr key={p.id} className="hover:bg-zinc-50">
                  <td className={tdCls}>{p.transactionRef ?? "—"}</td>
                  <td className={tdCls}>{SCENARIO_LABELS[p.scenario as keyof typeof SCENARIO_LABELS] ?? p.scenario}</td>
                  <td className={tdCls}>
                    <Badge tone={statusTone(p.status)}>{p.status}</Badge>
                  </td>
                  <td className={tdCls}>{formatUSD(p.amountCents)}</td>
                  <td className={tdCls}>{fmtDate(p.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
