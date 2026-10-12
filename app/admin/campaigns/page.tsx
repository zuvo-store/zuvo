export const dynamic = "force-dynamic";
import Link from "next/link";
import { db } from "@/lib/db";
import { formatUSD, toCents } from "@/lib/money";
import { audit } from "@/lib/audit";
import { getSessionUser, requireAdminPage } from "@/lib/auth";
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

function parseCampaign(fd: FormData) {
  const str = (k: string) => String(fd.get(k) ?? "").trim();
  const name = str("name");
  if (!name) throw new Error("Campaign name is required.");
  const discountType = str("discountType");
  if (!["PERCENT", "FIXED"].includes(discountType)) throw new Error("Invalid discount type.");
  const rawValue = str("discountValue");
  let discountValue: number;
  if (discountType === "PERCENT") {
    discountValue = Number(rawValue);
    if (!Number.isInteger(discountValue) || discountValue < 1 || discountValue > 90) {
      throw new Error("Percent must be a whole number 1–90.");
    }
  } else {
    const dollars = Number(rawValue);
    if (!Number.isFinite(dollars) || dollars <= 0) throw new Error("Fixed discount must be a positive dollar amount.");
    discountValue = toCents(dollars);
  }
  const minRaw = str("minOrder");
  const minOrder = minRaw === "" ? 0 : Number(minRaw);
  if (!Number.isFinite(minOrder) || minOrder < 0) throw new Error("Minimum order must be a non-negative dollar amount.");
  const parseDate = (k: string, required: boolean) => {
    const v = str(k);
    if (!v) {
      if (required) throw new Error(`${k === "startsAt" ? "Start" : "End"} date is required.`);
      return null;
    }
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) throw new Error(`Invalid date for ${k}.`);
    return d;
  };
  const startsAt = parseDate("startsAt", true)!;
  const endsAt = parseDate("endsAt", true)!;
  if (endsAt <= startsAt) throw new Error("End date must be after start date.");
  const appliesTo = str("appliesTo");
  if (!["ALL", "CATEGORY"].includes(appliesTo)) throw new Error("Invalid scope.");
  const categoryId = appliesTo === "CATEGORY" ? str("categoryId") || null : null;
  if (appliesTo === "CATEGORY" && !categoryId) throw new Error("Choose a category for category campaigns.");
  return {
    name,
    bannerText: str("bannerText") || null,
    discountType,
    discountValue,
    appliesTo,
    categoryId,
    minOrderCents: toCents(minOrder),
    startsAt,
    endsAt,
    active: fd.get("active") === "on",
  };
}

async function createCampaign(formData: FormData) {
  "use server";
  const me = await getSessionUser();
  const outcome = await (async () => {
    try {
      const data = parseCampaign(formData);
      const created = await db.campaign.create({ data });
      await audit("campaign.create", { actorId: me?.id, entity: "Campaign", entityId: created.id, meta: { name: data.name } });
      return { ok: true as const };
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : "Failed to create campaign." };
    }
  })();
  if (!outcome.ok) redirect("/admin/campaigns?error=" + encodeURIComponent(outcome.error));
  revalidatePath("/admin/campaigns");
}

async function updateCampaign(formData: FormData) {
  "use server";
  const id = String(formData.get("id") ?? "");
  const me = await getSessionUser();
  const outcome = await (async () => {
    try {
      const data = parseCampaign(formData);
      await db.campaign.update({ where: { id }, data });
      await audit("campaign.update", { actorId: me?.id, entity: "Campaign", entityId: id, meta: { name: data.name } });
      return { ok: true as const };
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : "Failed to update campaign." };
    }
  })();
  if (!outcome.ok) redirect(`/admin/campaigns?edit=${id}&error=` + encodeURIComponent(outcome.error));
  redirect("/admin/campaigns?saved=1");
}

async function deleteCampaign(formData: FormData) {
  "use server";
  const id = String(formData.get("id") ?? "");
  const me = await getSessionUser();
  await db.campaign.delete({ where: { id } });
  await audit("campaign.delete", { actorId: me?.id, entity: "Campaign", entityId: id });
  revalidatePath("/admin/campaigns");
}

async function toggleCampaign(formData: FormData) {
  "use server";
  const id = String(formData.get("id") ?? "");
  const active = formData.get("active") === "on";
  await db.campaign.update({ where: { id }, data: { active } });
  revalidatePath("/admin/campaigns");
}

type CampaignRow = {
  id: string; name: string; bannerText: string | null;
  discountType: string; discountValue: number; appliesTo: string;
  categoryId: string | null; minOrderCents: number;
  startsAt: Date; endsAt: Date; active: boolean;
  category?: { name: string } | null;
};

function CampaignForm({ campaign, categories }: { campaign?: CampaignRow | null; categories: { id: string; name: string }[] }) {
  const isEdit = Boolean(campaign);
  const toInput = (d: Date | null) =>
    d ? new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "";
  return (
    <form action={isEdit ? updateCampaign : createCampaign} className={`${cardCls} mb-6 grid gap-4 p-5 sm:grid-cols-3`}>
      {isEdit ? <input type="hidden" name="id" value={campaign!.id} /> : null}
      <h2 className="text-base font-bold text-zinc-900 sm:col-span-3">
        {isEdit ? "Edit campaign" : "🎉 New sale campaign"}
      </h2>
      <Field label="Campaign name">
        <input name="name" required className={inputCls} defaultValue={campaign?.name ?? ""} placeholder="Eid Mega Sale" />
      </Field>
      <Field label="Banner text" hint="Shown on the storefront during the sale">
        <input name="bannerText" className={inputCls} defaultValue={campaign?.bannerText ?? ""} placeholder="EID SALE — 25% OFF everything!" />
      </Field>
      <Field label="Discount type">
        <select name="discountType" className={inputCls} defaultValue={campaign?.discountType ?? "PERCENT"}>
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
          defaultValue={campaign ? (campaign.discountType === "PERCENT" ? String(campaign.discountValue) : (campaign.discountValue / 100).toFixed(2)) : ""}
        />
      </Field>
      <Field label="Applies to">
        <select name="appliesTo" className={inputCls} defaultValue={campaign?.appliesTo ?? "ALL"}>
          <option value="ALL">Entire store</option>
          <option value="CATEGORY">One category</option>
        </select>
      </Field>
      <Field label="Category" hint="Only for category campaigns">
        <select name="categoryId" className={inputCls} defaultValue={campaign?.categoryId ?? ""}>
          <option value="">—</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </Field>
      <Field label="Minimum order (USD)">
        <input name="minOrder" inputMode="decimal" className={inputCls} defaultValue={campaign ? (campaign.minOrderCents / 100).toFixed(2) : "0"} />
      </Field>
      <Field label="Starts at">
        <input type="datetime-local" name="startsAt" required className={inputCls} defaultValue={toInput(campaign?.startsAt ?? null)} />
      </Field>
      <Field label="Ends at">
        <input type="datetime-local" name="endsAt" required className={inputCls} defaultValue={toInput(campaign?.endsAt ?? null)} />
      </Field>
      <label className="flex items-center gap-2 self-end text-sm font-medium text-zinc-700">
        <input type="checkbox" name="active" defaultChecked={campaign?.active ?? true} className="h-4 w-4 rounded border-zinc-300" />
        Active
      </label>
      <div className="flex gap-2 sm:col-span-3">
        <button type="submit" className={btnPrimary}>{isEdit ? "Save changes" : "Launch campaign 🚀"}</button>
        {isEdit ? <Link href="/admin/campaigns" className={btnSecondary}>Cancel</Link> : null}
      </div>
    </form>
  );
}

function statusOf(c: CampaignRow, now: Date): { label: string; tone: "green" | "amber" | "zinc" } {
  if (!c.active) return { label: "Paused", tone: "zinc" };
  if (now < c.startsAt) return { label: "Scheduled", tone: "amber" };
  if (now > c.endsAt) return { label: "Ended", tone: "zinc" };
  return { label: "🔴 LIVE", tone: "green" };
}

export default async function AdminCampaignsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdminPage();
  const sp = await searchParams;
  const editId = qp(sp, "edit");
  const now = new Date();
  const campaigns = await db.campaign.findMany({
    orderBy: { startsAt: "desc" },
    include: { category: { select: { name: true } } },
  });
  const categories = await db.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } });
  const editing = editId ? (campaigns.find((c) => c.id === editId) ?? null) : null;

  return (
    <div>
      <SectionTitle title="Discount Campaigns" subtitle="Scheduled sale events — auto-applied at checkout with a storefront banner" />
      <FormError message={qp(sp, "error")} />
      {qp(sp, "saved") ? (
        <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          Campaign saved.
        </div>
      ) : null}

      <CampaignForm campaign={editing} categories={categories} />

      <h2 className="mb-3 text-lg font-bold text-zinc-900">All campaigns</h2>
      <div className={tableWrapCls}>
        <table className={tableCls}>
          <thead>
            <tr>
              <th className={thCls}>Campaign</th>
              <th className={thCls}>Discount</th>
              <th className={thCls}>Scope</th>
              <th className={thCls}>Window</th>
              <th className={thCls}>Status</th>
              <th className={thCls}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((c) => {
              const st = statusOf(c, now);
              return (
                <tr key={c.id}>
                  <td className={tdCls}>
                    <p className="font-bold">{c.name}</p>
                    {c.bannerText ? <p className="text-xs text-zinc-500">{c.bannerText}</p> : null}
                  </td>
                  <td className={tdCls}>
                    <span className="font-bold text-orange-600">
                      {c.discountType === "PERCENT" ? `${c.discountValue}% OFF` : `${formatUSD(c.discountValue)} off`}
                    </span>
                    {c.minOrderCents > 0 ? <p className="text-xs text-zinc-500">min {formatUSD(c.minOrderCents)}</p> : null}
                  </td>
                  <td className={tdCls}>{c.appliesTo === "CATEGORY" ? c.category?.name ?? "Category" : "Entire store"}</td>
                  <td className={tdCls}>
                    <p className="text-xs">{fmtDate(c.startsAt)}</p>
                    <p className="text-xs text-zinc-500">→ {fmtDate(c.endsAt)}</p>
                  </td>
                  <td className={tdCls}><Badge tone={st.tone}>{st.label}</Badge></td>
                  <td className={tdCls}>
                    <div className="flex flex-wrap gap-1.5">
                      <Link href={`/admin/campaigns?edit=${c.id}`} className={btnSm}>Edit</Link>
                      <form action={toggleCampaign}>
                        <input type="hidden" name="id" value={c.id} />
                        <input type="hidden" name="active" value={c.active ? "off" : "on"} />
                        <button type="submit" className={btnSm}>{c.active ? "Pause" : "Resume"}</button>
                      </form>
                      <form action={deleteCampaign}>
                        <input type="hidden" name="id" value={c.id} />
                        <button type="submit" className={btnSm}>Delete</button>
                      </form>
                    </div>
                  </td>
                </tr>
              );
            })}
            {campaigns.length === 0 ? (
              <tr><td className={tdCls} colSpan={6}>No campaigns yet — launch your first sale above! 🎉</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
