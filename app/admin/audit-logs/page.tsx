export const dynamic = "force-dynamic";
import { db } from "@/lib/db";
import { btnSecondary, inputCls, SectionTitle } from "@/components/ui";
import Pagination from "@/components/Pagination";
import { qp, pageNumber, fmtDate, tableWrapCls, tableCls, thCls, tdCls, type SearchParams } from "../_helpers";
import { requireAdminPage } from "@/lib/auth";

const PAGE_SIZE = 50;

export default async function AdminAuditLogsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdminPage(); // must run before any data fetch (see lib/auth.ts)
  const sp = await searchParams;
  const action = (qp(sp, "action") ?? "").trim();
  const entity = (qp(sp, "entity") ?? "").trim();
  const page = pageNumber(sp);

  const where = {
    ...(action ? { action: { contains: action } } : {}),
    ...(entity ? { entity: { contains: entity } } : {}),
  };

  const [total, logs] = await Promise.all([
    db.auditLog.count({ where }),
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { actor: { select: { name: true, email: true } } },
    }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <SectionTitle title="Audit logs" />
      <p className="mb-4 text-sm text-zinc-500">{total} entr{total === 1 ? "y" : "ies"}</p>

      <form method="get" className="mb-4 flex flex-wrap gap-2">
        <input name="action" defaultValue={action} placeholder="Filter by action…" className={`${inputCls} max-w-xs`} />
        <input name="entity" defaultValue={entity} placeholder="Filter by entity…" className={`${inputCls} max-w-xs`} />
        <button type="submit" className={btnSecondary}>Filter</button>
        {action || entity ? (
          <a href="/admin/audit-logs" className={btnSecondary}>Clear</a>
        ) : null}
      </form>

      <div className={tableWrapCls}>
        <table className={tableCls}>
          <thead>
            <tr>
              <th className={thCls}>Date</th>
              <th className={thCls}>Actor</th>
              <th className={thCls}>Action</th>
              <th className={thCls}>Entity</th>
              <th className={thCls}>Entity ID</th>
              <th className={thCls}>Meta</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {logs.map((l) => {
              const meta = l.metaJson ? JSON.stringify(l.metaJson) : "";
              return (
                <tr key={l.id} className="hover:bg-zinc-50">
                  <td className={tdCls}>{fmtDate(l.createdAt)}</td>
                  <td className={tdCls}>
                    {l.actor ? (
                      <span>{l.actor.name}<span className="block text-xs text-zinc-500">{l.actor.email}</span></span>
                    ) : (
                      <span className="text-zinc-400">system</span>
                    )}
                  </td>
                  <td className={tdCls}><span className="font-mono text-xs">{l.action}</span></td>
                  <td className={tdCls}>{l.entity}</td>
                  <td className={tdCls}>
                    {l.entityId ? <span className="font-mono text-xs" title={l.entityId}>{l.entityId.slice(0, 12)}…</span> : "—"}
                  </td>
                  <td className={tdCls}>
                    {meta ? (
                      <span className="font-mono text-xs text-zinc-500" title={meta}>
                        {meta.length > 80 ? meta.slice(0, 80) + "…" : meta}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={totalPages} basePath="/admin/audit-logs" />
    </div>
  );
}
