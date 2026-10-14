export const dynamic = "force-dynamic";
import { db } from "@/lib/db";
import { formatUSD } from "@/lib/money";
import { requireUser } from "@/lib/auth";
import { SectionTitle, Badge, cardCls } from "@/components/ui";
import CopyButton from "@/components/CopyButton";
import UseVoucherButton from "@/components/UseVoucherButton";

type VoucherState = "available" | "expiring" | "used" | "expired";

function stateOf(
  p: { active: boolean; startsAt: Date | null; endsAt: Date | null; usageLimit: number | null; usedCount: number },
  usedCodes: Set<string>,
  code: string,
  now: Date
): VoucherState {
  if (usedCodes.has(code)) return "used";
  const expired =
    !p.active ||
    (p.endsAt !== null && p.endsAt < now) ||
    (p.usageLimit !== null && p.usedCount >= p.usageLimit) ||
    (p.startsAt !== null && p.startsAt > now);
  // startsAt in future = not yet available → treat as expired bucket ("coming soon" hidden)
  if (expired) return "expired";
  if (p.endsAt && p.endsAt.getTime() - now.getTime() < 7 * 24 * 3600 * 1000) return "expiring";
  return "available";
}

const STATE_META: Record<VoucherState, { label: string; tone: "green" | "amber" | "zinc" | "blue" }> = {
  available: { label: "Available", tone: "green" },
  expiring: { label: "Expiring soon", tone: "amber" },
  used: { label: "Used", tone: "blue" },
  expired: { label: "Expired", tone: "zinc" },
};

function fmtDate(d: Date | null): string {
  if (!d) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default async function VouchersPage() {
  const user = await requireUser();
  const now = new Date();

  const [promotions, usedOrders] = await Promise.all([
    db.promotion.findMany({
      where: {
        code: { not: null },
        OR: [{ userId: null }, { userId: user.id }], // public + mine
      },
      orderBy: [{ active: "desc" }, { endsAt: "asc" }],
    }),
    db.order.findMany({
      where: { userId: user.id, promoCode: { not: null }, status: { notIn: ["DRAFT", "PENDING_PAYMENT", "CANCELLED"] } },
      select: { promoCode: true },
    }),
  ]);

  const usedCodes = new Set(usedOrders.map((o) => (o.promoCode ?? "").toUpperCase()));

  const vouchers = promotions
    .filter((p) => p.code)
    .map((p) => ({
      ...p,
      code: p.code!,
      state: stateOf(p, usedCodes, p.code!.toUpperCase(), now),
      personal: p.userId === user.id,
    }));

  const available = vouchers.filter((v) => v.state === "available" || v.state === "expiring");
  const past = vouchers.filter((v) => v.state === "used" || v.state === "expired");

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
      <SectionTitle title="My Vouchers" subtitle="Promo codes you can use at checkout" />

      {/* Available */}
      <h2 className="mb-3 mt-6 text-sm font-bold uppercase tracking-wide text-zinc-500">
        Available ({available.length})
      </h2>
      {available.length === 0 ? (
        <div className={`${cardCls} p-6 text-center text-sm text-zinc-500`}>
          🎟️ No vouchers right now — check back during sales!
        </div>
      ) : (
        <div className="space-y-3">
          {available.map((v) => {
            const meta = STATE_META[v.state];
            return (
              <div
                key={v.id}
                className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-orange-50 to-amber-50 shadow-sm ring-1 ring-orange-200"
              >
                <div className="flex">
                  {/* Main part */}
                  <div className="min-w-0 flex-1 p-4 sm:p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={meta.tone}>{meta.label}</Badge>
                      {v.personal ? <Badge tone="blue">👤 Just for you</Badge> : null}
                    </div>
                    <p className="mt-2 text-3xl font-black tracking-tight text-orange-600">
                      {v.discountType === "PERCENT"
                        ? `${v.discountValue}% OFF`
                        : `${formatUSD(v.discountValue)} OFF`}
                    </p>
                    {v.title ? <p className="mt-1 truncate text-sm font-medium text-zinc-700">{v.title}</p> : null}
                    <p className="mt-1.5 font-mono text-sm font-bold tracking-widest text-zinc-900">{v.code}</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {v.minOrderCents > 0 ? <>Min order {formatUSD(v.minOrderCents)}</> : "No minimum order"}
                      {v.usageLimit ? <> • {Math.max(0, v.usageLimit - v.usedCount)} left</> : null}
                    </p>
                    <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-zinc-700">
                      <span aria-hidden="true">📅</span>
                      {v.endsAt ? `Valid till ${fmtDate(v.endsAt)}` : "No expiry"}
                    </p>
                  </div>
                  {/* Perforated divider with ticket notches */}
                  <div aria-hidden="true" className="relative w-0 shrink-0 border-l-2 border-dashed border-orange-300">
                    <span className="absolute -left-3 -top-3 h-6 w-6 rounded-full bg-white" />
                    <span className="absolute -bottom-3 -left-3 h-6 w-6 rounded-full bg-white" />
                  </div>
                  {/* Stub */}
                  <div className="flex w-[112px] shrink-0 flex-col justify-center gap-2 p-3">
                    <CopyButton text={v.code!} />
                    <UseVoucherButton code={v.code!} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Used & Expired */}
      {past.length > 0 ? (
        <>
          <h2 className="mb-3 mt-8 text-sm font-bold uppercase tracking-wide text-zinc-500">
            Used & Expired ({past.length})
          </h2>
          <div className="space-y-3">
            {past.map((v) => {
              const meta = STATE_META[v.state];
              return (
                <div
                  key={v.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 opacity-70"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-extrabold tracking-widest text-zinc-500 line-through">{v.code}</p>
                      <Badge tone={meta.tone}>{meta.label}</Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {v.discountType === "PERCENT" ? `${v.discountValue}% OFF` : `${formatUSD(v.discountValue)} off`}
                      {" • "}ended {fmtDate(v.endsAt)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : null}
    </div>
  );
}
