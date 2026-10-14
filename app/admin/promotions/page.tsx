export const dynamic = "force-dynamic";
import Link from "next/link";
import DeletePromotionButton from "@/components/admin/DeletePromotionButton";
import { db } from "@/lib/db";
import { formatUSD, toCents } from "@/lib/money";
import { audit } from "@/lib/audit";
import { getSessionUser, requireAdminPage} from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  btnPrimary,
  btnSecondary,
  inputCls,
  cardCls,
  Field,
  Badge,
  FormError,
  SectionTitle,
} from "@/components/ui";
import { qp, fmtDate, tableWrapCls, tableCls, thCls, tdCls, btnSm, type SearchParams } from "../_helpers";

const DISCOUNT_TYPES = ["PERCENT", "FIXED"];

type PromoRow = {
  id: string; active: boolean; startsAt: Date | null; endsAt: Date | null;
};

type PromoFilter = "" | "active" | "scheduled" | "off" | "expired";
const PROMO_FILTERS: PromoFilter[] = ["active", "scheduled", "off", "expired"];

// Single status per promotion (priority: off → scheduled → expired → active).
function promoStatus(p: PromoRow, now: Date): Exclude<PromoFilter, ""> {
  if (!p.active) return "off";
  if (p.startsAt && now < p.startsAt) return "scheduled";
  if (p.endsAt && now > p.endsAt) return "expired";
  return "active";
}

function promoFilterOf(raw: string | null | undefined): PromoFilter {
  return (PROMO_FILTERS as string[]).includes(raw ?? "") ? (raw as PromoFilter) : "";
}

function parsePromotion(fd: FormData) {
  const str = (k: string) => {
    const v = fd.get(k);
    return typeof v === "string" ? v.trim() : "";
  };
  const title = str("title");
  if (!title) throw new Error("Title is required.");
  const discountType = str("discountType");
  if (!DISCOUNT_TYPES.includes(discountType)) throw new Error("Invalid discount type.");
  const rawValue = str("discountValue");
  let discountValue: number;
  if (discountType === "PERCENT") {
    discountValue = Number(rawValue);
    if (!Number.isInteger(discountValue) || discountValue < 1 || discountValue > 90) {
      throw new Error("Percent discount must be an integer between 1 and 90.");
    }
  } else {
    const dollars = Number(rawValue);
    if (!Number.isFinite(dollars) || dollars <= 0) throw new Error("Fixed discount must be a positive dollar amount.");
    discountValue = toCents(dollars);
  }
  const minRaw = str("minOrder");
  const minOrder = minRaw === "" ? 0 : Number(minRaw);
  if (!Number.isFinite(minOrder) || minOrder < 0) throw new Error("Minimum order must be a non-negative dollar amount.");
  const code = str("code").toUpperCase() || null;
  const parseDate = (k: string) => {
    const v = str(k);
    if (!v) return null;
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) throw new Error(`Invalid date for ${k}.`);
    return d;
  };
  const limitRaw = str("usageLimit");
  const usageLimit = limitRaw === "" ? null : Number(limitRaw);
  if (usageLimit !== null && (!Number.isInteger(usageLimit) || usageLimit < 1)) {
    throw new Error("Usage limit must be a positive integer.");
  }
  return {
    code,
    title,
    description: str("description") || null,
    discountType,
    discountValue,
    minOrderCents: toCents(minOrder),
    active: fd.get("active") === "on",
    startsAt: parseDate("startsAt"),
    endsAt: parseDate("endsAt"),
    usageLimit,
    userId: str("userId") || null,
  };
}

async function deletePromotion(formData: FormData) {
  "use server";
  const id = String(formData.get("id") ?? "");
  const me = await getSessionUser();
  if (!me || me.role !== "ADMIN") redirect("/admin/promotions?error=" + encodeURIComponent("Admin only."));
  const promo = await db.promotion.findUnique({ where: { id }, select: { code: true } });
  await db.promotion.delete({ where: { id } });
  await audit("promotion.delete", { actorId: me.id, entity: "Promotion", entityId: id, meta: { code: promo?.code } });
  redirect("/admin/promotions?saved=1");
}

async function createPromotion(formData: FormData) {
  "use server";
  const me = await getSessionUser();
  const outcome = await (async () => {
    try {
      const data = parsePromotion(formData);
      const created = await db.promotion.create({ data });
      await audit("promotion.create", { actorId: me?.id, entity: "Promotion", entityId: created.id, meta: { code: data.code } });
      return { ok: true as const };
    } catch (e) {
      if (typeof e === "object" && e !== null && "code" in e && (e as { code?: unknown }).code === "P2002") {
        return { ok: false as const, error: "That promo code is already in use." };
      }
      return { ok: false as const, error: e instanceof Error ? e.message : "Failed to create promotion." };
    }
  })();
  if (!outcome.ok) redirect("/admin/promotions?error=" + encodeURIComponent(outcome.error));
  revalidatePath("/admin/promotions");
}

async function updatePromotion(formData: FormData) {
  "use server";
  const id = String(formData.get("id") ?? "");
  const me = await getSessionUser();
  const outcome = await (async () => {
    try {
      const data = parsePromotion(formData);
      await db.promotion.update({ where: { id }, data });
      await audit("promotion.update", { actorId: me?.id, entity: "Promotion", entityId: id, meta: { code: data.code } });
      return { ok: true as const };
    } catch (e) {
      if (typeof e === "object" && e !== null && "code" in e && (e as { code?: unknown }).code === "P2002") {
        return { ok: false as const, error: "That promo code is already in use." };
      }
      return { ok: false as const, error: e instanceof Error ? e.message : "Failed to update promotion." };
    }
  })();
  if (!outcome.ok) redirect(`/admin/promotions?edit=${id}&error=` + encodeURIComponent(outcome.error));
  redirect("/admin/promotions?saved=1");
}

function PromotionForm({
  promo,
  customers,
}: {
  promo?: {
    id: string; code: string | null; title: string; description: string | null;
    discountType: string; discountValue: number; minOrderCents: number;
    active: boolean; startsAt: Date | null; endsAt: Date | null; usageLimit: number | null;
    userId: string | null;
  } | null;
  customers: { id: string; name: string; email: string }[];
}) {
  const isEdit = Boolean(promo);
  const toInput = (d: Date | null) => (d ? new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "");
  return (
    <form action={isEdit ? updatePromotion : createPromotion} className={`${cardCls} mb-6 grid gap-4 p-5 sm:grid-cols-3`}>
      {isEdit ? <input type="hidden" name="id" value={promo!.id} /> : null}
      <h2 className="text-base font-bold text-zinc-900 sm:col-span-3">{isEdit ? "Edit promotion" : "New promotion"}</h2>
      <Field label="Assign to customer" hint="Empty = public code for everyone">
        <select name="userId" className={inputCls} defaultValue={promo?.userId ?? ""}>
          <option value="">Everyone (public)</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>{c.name} — {c.email}</option>
          ))}
        </select>
      </Field>
      <Field label="Code (optional)">
        <input name="code" className={inputCls} defaultValue={promo?.code ?? ""} placeholder="WELCOME10" />
      </Field>
      <Field label="Title">
        <input name="title" required className={inputCls} defaultValue={promo?.title ?? ""} placeholder="10% off orders over $25" />
      </Field>
      <Field label="Discount type">
        <select name="discountType" className={inputCls} defaultValue={promo?.discountType ?? "PERCENT"}>
          <option value="PERCENT">Percent (%)</option>
          <option value="FIXED">Fixed (USD)</option>
        </select>
      </Field>
      <Field label="Discount value" hint="Percent: 1–90. Fixed: dollars.">
        <input
          name="discountValue"
          required
          inputMode="decimal"
          className={inputCls}
          defaultValue={promo ? (promo.discountType === "PERCENT" ? String(promo.discountValue) : (promo.discountValue / 100).toFixed(2)) : ""}
        />
      </Field>
      <Field label="Minimum order (USD)">
        <input name="minOrder" inputMode="decimal" className={inputCls} defaultValue={promo ? (promo.minOrderCents / 100).toFixed(2) : "0"} />
      </Field>
      <Field label="Usage limit (optional)">
        <input name="usageLimit" inputMode="numeric" className={inputCls} defaultValue={promo?.usageLimit != null ? String(promo.usageLimit) : ""} />
      </Field>
      <Field label="Starts at (optional)">
        <input type="datetime-local" name="startsAt" className={inputCls} defaultValue={toInput(promo?.startsAt ?? null)} />
      </Field>
      <Field label="Ends at (optional)">
        <input type="datetime-local" name="endsAt" className={inputCls} defaultValue={toInput(promo?.endsAt ?? null)} />
      </Field>
      <label className="flex items-center gap-2 self-end text-sm font-medium text-zinc-700">
        <input type="checkbox" name="active" defaultChecked={promo?.active ?? true} className="h-4 w-4 rounded border-zinc-300" />
        Active
      </label>
      <Field label="Description" className="sm:col-span-3">
        <input name="description" className={inputCls} defaultValue={promo?.description ?? ""} />
      </Field>
      <div className="flex gap-2 sm:col-span-3">
        <button type="submit" className={btnPrimary}>{isEdit ? "Save changes" : "Create promotion"}</button>
        {isEdit ? <Link href="/admin/promotions" className={btnSecondary}>Cancel</Link> : null}
      </div>
    </form>
  );
}

export default async function AdminPromotionsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdminPage(); // must run before any data fetch (see lib/auth.ts)
  const sp = await searchParams;
  const editId = qp(sp, "edit");
  const f = promoFilterOf(qp(sp, "f"));
  const now = new Date();
  const promotions = await db.promotion.findMany({
    orderBy: { createdAt: "desc" },
    include: { user: { select: { name: true, email: true } } },
  });
  const customers = await db.user.findMany({
    where: { role: "CUSTOMER" },
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true },
    take: 200,
  });
  const editing = editId ? promotions.find((p) => p.id === editId) ?? null : null;

  const counts: Record<Exclude<PromoFilter, "">, number> = { active: 0, scheduled: 0, off: 0, expired: 0 };
  for (const p of promotions) counts[promoStatus(p, now)]++;
  const shown = f ? promotions.filter((p) => promoStatus(p, now) === f) : promotions;

  const tileHref = (target: PromoFilter) => {
    const p = new URLSearchParams();
    // Clicking the active card clears the filter (toggle).
    if (target && target !== f) p.set("f", target);
    const qs = p.toString();
    return qs ? `/admin/promotions?${qs}` : "/admin/promotions";
  };
  const tiles = [
    { icon: "🎟️", label: "Total promotions", value: String(promotions.length), href: tileHref(""), active: f === "" },
    { icon: "🔴", label: "Active", value: String(counts.active), href: tileHref("active"), active: f === "active" },
    { icon: "📅", label: "Scheduled", value: String(counts.scheduled), href: tileHref("scheduled"), active: f === "scheduled" },
    { icon: "⏸️", label: "Off", value: String(counts.off), href: tileHref("off"), active: f === "off" },
    { icon: "🏁", label: "Expired", value: String(counts.expired), href: tileHref("expired"), active: f === "expired" },
  ];

  return (
    <div>
      <SectionTitle title="Promotions" />
      <FormError message={qp(sp, "error")} />
      {qp(sp, "saved") ? (
        <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          Promotion saved.
        </div>
      ) : null}

      <PromotionForm promo={editing} customers={customers} />

      <h2 className="mb-3 text-lg font-bold text-zinc-900">
        All promotions
        {f ? <span className="ml-2 text-sm font-medium text-zinc-500">({shown.length} shown)</span> : null}
      </h2>
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
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
            <Link key={t.label} href={t.href} className="block h-full">{inner}</Link>
          );
        })}
      </div>
      <div className={tableWrapCls}>
        <table className={tableCls}>
          <thead>
            <tr>
              <th className={thCls}>Code</th>
              <th className={thCls}>Title</th>
              <th className={thCls}>For</th>
              <th className={thCls}>Discount</th>
              <th className={thCls}>Min order</th>
              <th className={thCls}>Used</th>
              <th className={thCls}>Active</th>
              <th className={thCls}>Window</th>
              <th className={thCls}>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {shown.map((p) => (
              <tr key={p.id} className="hover:bg-zinc-50">
                <td className={tdCls}><span className="font-mono text-xs font-semibold">{p.code ?? "—"}</span></td>
                <td className={tdCls}>{p.title}</td>
                <td className={tdCls}>
                  {p.user ? (
                    <span className="text-xs font-medium text-violet-700">👤 {p.user.name}</span>
                  ) : (
                    <span className="text-xs text-zinc-400">Everyone</span>
                  )}
                </td>
                <td className={tdCls}>
                  {p.discountType === "PERCENT" ? `${p.discountValue}%` : formatUSD(p.discountValue)}
                </td>
                <td className={tdCls}>{formatUSD(p.minOrderCents)}</td>
                <td className={tdCls}>
                  {p.usedCount}{p.usageLimit ? ` / ${p.usageLimit}` : ""}
                </td>
                <td className={tdCls}>
                  <Badge tone={p.active ? "green" : "zinc"}>{p.active ? "active" : "off"}</Badge>
                </td>
                <td className={tdCls}>
                  <span className="text-xs text-zinc-500">
                    {p.startsAt ? fmtDate(p.startsAt) : "—"} → {p.endsAt ? fmtDate(p.endsAt) : "—"}
                  </span>
                </td>
                <td className={tdCls}>
                  <div className="flex items-center gap-2">
                    <Link href={`/admin/promotions?edit=${p.id}`} className={`${btnSecondary} ${btnSm}`}>
                      Edit
                    </Link>
                    <DeletePromotionButton id={p.id} label={p.code ?? p.title} action={deletePromotion} />
                  </div>
                </td>
              </tr>
            ))}
            {shown.length === 0 && (
              <tr>
                <td className={tdCls} colSpan={9}>
                  <p className="px-4 py-10 text-center text-sm text-zinc-400">
                    {f ? "No promotions match this filter." : "No promotions yet."}
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
