export const dynamic = "force-dynamic";
import { db } from "@/lib/db";
import { getSessionUser, requireAdminPage} from "@/lib/auth";
import { setAttributionStatus, REFERRAL_STATUSES } from "@/lib/referrals";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { btnSecondary, Badge, FormError, SectionTitle } from "@/components/ui";
import { qp, fmtDate, statusTone, tableWrapCls, tableCls, thCls, tdCls, btnSm, type SearchParams } from "../_helpers";

async function changeAttributionStatus(formData: FormData) {
  "use server";
  const me = await getSessionUser();
  if (!me) redirect("/admin/referrals?error=" + encodeURIComponent("Not signed in."));
  const id = String(formData.get("id") ?? "");
  const to = String(formData.get("to") ?? "");
  const outcome = await (async () => {
    try {
      await setAttributionStatus(id, to, me.id);
      return { ok: true as const };
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : "Failed to update attribution." };
    }
  })();
  if (!outcome.ok) redirect("/admin/referrals?error=" + encodeURIComponent(outcome.error));
  revalidatePath("/admin/referrals");
}

export default async function AdminReferralsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdminPage(); // must run before any data fetch (see lib/auth.ts)
  const sp = await searchParams;
  const [attributions, visits] = await Promise.all([
    db.referralAttribution.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        referrer: { select: { name: true, email: true } },
        referred: { select: { name: true, email: true, createdAt: true } },
      },
    }),
    db.referralVisit.groupBy({
      by: ["code"],
      _count: { code: true },
      orderBy: { _count: { code: "desc" } },
    }),
  ]);

  return (
    <div>
      <SectionTitle title="Referrals" />
      <FormError message={qp(sp, "error")} />

      <h2 className="mb-3 text-lg font-bold text-zinc-900">Attributions (latest 100)</h2>
      {attributions.length === 0 ? (
        <p className="text-sm text-zinc-500">No referral attributions yet.</p>
      ) : (
        <div className={tableWrapCls}>
          <table className={tableCls}>
            <thead>
              <tr>
                <th className={thCls}>Referrer</th>
                <th className={thCls}>Referred</th>
                <th className={thCls}>Code</th>
                <th className={thCls}>Status</th>
                <th className={thCls}>Date</th>
                <th className={thCls}>Set status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {attributions.map((a) => (
                <tr key={a.id} className="hover:bg-zinc-50">
                  <td className={tdCls}>
                    {a.referrer.name}
                    <span className="block text-xs text-zinc-500">{a.referrer.email}</span>
                  </td>
                  <td className={tdCls}>
                    {a.referred.name}
                    <span className="block text-xs text-zinc-500">{a.referred.email}</span>
                  </td>
                  <td className={tdCls}><span className="font-mono text-xs">{a.code}</span></td>
                  <td className={tdCls}><Badge tone={statusTone(a.status)}>{a.status}</Badge></td>
                  <td className={tdCls}>{fmtDate(a.createdAt)}</td>
                  <td className={tdCls}>
                    <form action={changeAttributionStatus} className="flex items-center gap-1.5">
                      <input type="hidden" name="id" value={a.id} />
                      <select name="to" defaultValue={a.status} className="rounded-lg border border-zinc-300 px-2 py-1 text-xs">
                        {REFERRAL_STATUSES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                      <button type="submit" className={`${btnSecondary} ${btnSm}`}>Set</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 className="mb-3 mt-8 text-lg font-bold text-zinc-900">Visits by code</h2>
      {visits.length === 0 ? (
        <p className="text-sm text-zinc-500">No referral visits recorded.</p>
      ) : (
        <div className={tableWrapCls}>
          <table className={tableCls}>
            <thead>
              <tr>
                <th className={thCls}>Code</th>
                <th className={thCls}>Visits</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {visits.map((v) => (
                <tr key={v.code} className="hover:bg-zinc-50">
                  <td className={tdCls}><span className="font-mono text-xs">{v.code}</span></td>
                  <td className={tdCls}>{v._count.code}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
