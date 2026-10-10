export const dynamic = "force-dynamic";
import Link from "next/link";
import { db } from "@/lib/db";
import { formatUSD, toCents } from "@/lib/money";
import { audit } from "@/lib/audit";
import { getSessionUser, requireAdminPage} from "@/lib/auth";
import { setRewardStatus, REWARD_STATUSES } from "@/lib/rewards";
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
import { qp, fmtDate, statusTone, tableWrapCls, tableCls, thCls, tdCls, btnSm, type SearchParams } from "../_helpers";

const CAMPAIGN_TYPES = ["SIGNUP", "REFERRAL"];
const CAMPAIGN_STATUSES = ["ACTIVE", "PAUSED", "ENDED"];

function parseCampaign(fd: FormData) {
  const str = (k: string) => {
    const v = fd.get(k);
    return typeof v === "string" ? v.trim() : "";
  };
  const name = str("name");
  if (!name) throw new Error("Name is required.");
  const amount = Number(str("amount"));
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Amount must be a positive dollar value.");
  const type = str("type");
  if (!CAMPAIGN_TYPES.includes(type)) throw new Error("Invalid campaign type.");
  const status = str("status");
  if (!CAMPAIGN_STATUSES.includes(status)) throw new Error("Invalid campaign status.");
  return {
    name,
    amountCents: toCents(amount),
    currency: "USD",
    type,
    status,
    label: str("label") || "DEMO — NO CASH VALUE",
    terms: str("terms") || null,
  };
}

async function createCampaign(formData: FormData) {
  "use server";
  const me = await getSessionUser();
  const outcome = await (async () => {
    try {
      const data = parseCampaign(formData);
      const created = await db.rewardCampaign.create({ data });
      await audit("campaign.create", { actorId: me?.id, entity: "RewardCampaign", entityId: created.id, meta: { name: data.name } });
      return { ok: true as const };
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : "Failed to create campaign." };
    }
  })();
  if (!outcome.ok) redirect("/admin/rewards?error=" + encodeURIComponent(outcome.error));
  revalidatePath("/admin/rewards");
}

async function updateCampaign(formData: FormData) {
  "use server";
  const id = String(formData.get("id") ?? "");
  const me = await getSessionUser();
  const outcome = await (async () => {
    try {
      const data = parseCampaign(formData);
      await db.rewardCampaign.update({ where: { id }, data });
      await audit("campaign.update", { actorId: me?.id, entity: "RewardCampaign", entityId: id, meta: { name: data.name } });
      return { ok: true as const };
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : "Failed to update campaign." };
    }
  })();
  if (!outcome.ok) redirect(`/admin/rewards?edit=${id}&error=` + encodeURIComponent(outcome.error));
  redirect("/admin/rewards?saved=1");
}

async function changeRewardStatus(formData: FormData) {
  "use server";
  const me = await getSessionUser();
  if (!me) redirect("/admin/rewards?error=" + encodeURIComponent("Not signed in."));
  const id = String(formData.get("id") ?? "");
  const to = String(formData.get("to") ?? "");
  const note = String(formData.get("note") ?? "").trim() || undefined;
  const outcome = await (async () => {
    try {
      await setRewardStatus(id, to, me.id, note);
      return { ok: true as const };
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : "Failed to update reward." };
    }
  })();
  if (!outcome.ok) redirect("/admin/rewards?error=" + encodeURIComponent(outcome.error));
  revalidatePath("/admin/rewards");
}

function CampaignForm({
  campaign,
  onCancelHref,
}: {
  campaign?: { id: string; name: string; amountCents: number; type: string; status: string; label: string; terms: string | null } | null;
  onCancelHref?: string;
}) {
  const isEdit = Boolean(campaign);
  return (
    <form action={isEdit ? updateCampaign : createCampaign} className={`${cardCls} mb-6 grid gap-4 p-5 sm:grid-cols-3`}>
      {isEdit ? <input type="hidden" name="id" value={campaign!.id} /> : null}
      <h2 className="text-base font-bold text-zinc-900 sm:col-span-3">
        {isEdit ? "Edit campaign" : "New campaign"}
      </h2>
      <Field label="Name">
        <input name="name" required className={inputCls} defaultValue={campaign?.name ?? ""} />
      </Field>
      <Field label="Amount (USD)">
        <input
          name="amount"
          required
          inputMode="decimal"
          className={inputCls}
          defaultValue={campaign ? (campaign.amountCents / 100).toFixed(2) : ""}
          placeholder="20.00"
        />
      </Field>
      <Field label="Type">
        <select name="type" className={inputCls} defaultValue={campaign?.type ?? "SIGNUP"}>
          {CAMPAIGN_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </Field>
      <Field label="Status">
        <select name="status" className={inputCls} defaultValue={campaign?.status ?? "ACTIVE"}>
          {CAMPAIGN_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </Field>
      <Field label="Label">
        <input name="label" className={inputCls} defaultValue={campaign?.label ?? "DEMO — NO CASH VALUE"} />
      </Field>
      <Field label="Terms" className="sm:col-span-3">
        <textarea name="terms" rows={2} className={inputCls} defaultValue={campaign?.terms ?? ""} />
      </Field>
      <div className="flex gap-2 sm:col-span-3">
        <button type="submit" className={btnPrimary}>{isEdit ? "Save changes" : "Create campaign"}</button>
        {isEdit && onCancelHref ? (
          <Link href={onCancelHref} className={btnSecondary}>Cancel</Link>
        ) : null}
      </div>
    </form>
  );
}

export default async function AdminRewardsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdminPage(); // must run before any data fetch (see lib/auth.ts)
  const sp = await searchParams;
  const editId = qp(sp, "edit");

  const [campaigns, rewards] = await Promise.all([
    db.rewardCampaign.findMany({ orderBy: { createdAt: "desc" }, include: { _count: { select: { rewards: true } } } }),
    db.reward.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        user: { select: { name: true, email: true } },
        campaign: { select: { name: true } },
      },
    }),
  ]);
  const editing = editId ? campaigns.find((c) => c.id === editId) ?? null : null;

  return (
    <div>
      <SectionTitle title="Rewards" />
      <FormError message={qp(sp, "error")} />
      {qp(sp, "saved") ? (
        <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          Campaign saved.
        </div>
      ) : null}

      <CampaignForm campaign={editing} onCancelHref="/admin/rewards" />

      <h2 className="mb-3 text-lg font-bold text-zinc-900">Campaigns</h2>
      <div className={tableWrapCls}>
        <table className={tableCls}>
          <thead>
            <tr>
              <th className={thCls}>Name</th>
              <th className={thCls}>Amount</th>
              <th className={thCls}>Type</th>
              <th className={thCls}>Status</th>
              <th className={thCls}>Rewards</th>
              <th className={thCls}>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {campaigns.map((c) => (
              <tr key={c.id} className="hover:bg-zinc-50">
                <td className={tdCls}>
                  <span className="font-medium">{c.name}</span>
                  <span className="block text-xs text-zinc-500">{c.label}</span>
                </td>
                <td className={tdCls}>{formatUSD(c.amountCents)}</td>
                <td className={tdCls}>{c.type}</td>
                <td className={tdCls}><Badge tone={statusTone(c.status)}>{c.status}</Badge></td>
                <td className={tdCls}>{c._count.rewards}</td>
                <td className={tdCls}>
                  <Link href={`/admin/rewards?edit=${c.id}`} className={`${btnSecondary} ${btnSm}`}>
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mb-3 mt-8 text-lg font-bold text-zinc-900">Rewards ledger (latest 50)</h2>
      {rewards.length === 0 ? (
        <p className="text-sm text-zinc-500">No rewards issued yet.</p>
      ) : (
        <div className={tableWrapCls}>
          <table className={tableCls}>
            <thead>
              <tr>
                <th className={thCls}>User</th>
                <th className={thCls}>Campaign</th>
                <th className={thCls}>Amount</th>
                <th className={thCls}>Status</th>
                <th className={thCls}>Claimed</th>
                <th className={thCls}>Set status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {rewards.map((r) => (
                <tr key={r.id} className="hover:bg-zinc-50">
                  <td className={tdCls}>
                    {r.user.name}
                    <span className="block text-xs text-zinc-500">{r.user.email}</span>
                  </td>
                  <td className={tdCls}>{r.campaign.name}</td>
                  <td className={tdCls}>{formatUSD(r.amountCents)}</td>
                  <td className={tdCls}><Badge tone={statusTone(r.status)}>{r.status}</Badge></td>
                  <td className={tdCls}>{fmtDate(r.claimedAt)}</td>
                  <td className={tdCls}>
                    <form action={changeRewardStatus} className="flex items-center gap-1.5">
                      <input type="hidden" name="id" value={r.id} />
                      <select name="to" defaultValue={r.status} className="rounded-lg border border-zinc-300 px-2 py-1 text-xs">
                        {REWARD_STATUSES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                      <input name="note" placeholder="Note" className="w-28 rounded-lg border border-zinc-300 px-2 py-1 text-xs" />
                      <button type="submit" className={`${btnSecondary} ${btnSm}`}>Set</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
