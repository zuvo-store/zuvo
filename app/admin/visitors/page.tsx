export const dynamic = "force-dynamic";
import { db } from "@/lib/db";
import { cardCls, SectionTitle } from "@/components/ui";
import { requireAdminPage } from "@/lib/auth";
import { BarChart } from "@/components/admin/Charts";
import Link from "next/link";

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function Kpi({ label, value, sub, tone = "text-zinc-900" }: { label: string; value: string; sub: string; tone?: string }) {
  return (
    <div className={cardCls + " p-5"}>
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">{label}</p>
      <p className={`mt-1 text-2xl font-extrabold ${tone}`}>{value}</p>
      <p className="mt-1 text-xs text-zinc-500">{sub}</p>
    </div>
  );
}

const RANGES = [7, 14, 30] as const;

export default async function AdminVisitorsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  await requireAdminPage();
  const sp = await searchParams;
  const rangeDays = RANGES.includes(Number(sp.range) as (typeof RANGES)[number]) ? Number(sp.range) : 30;
  const now = new Date();
  const since = new Date(now);
  since.setDate(since.getDate() - (rangeDays - 1));
  since.setHours(0, 0, 0, 0);

  const views = await db.pageView.findMany({
    where: { createdAt: { gte: since } },
    select: { path: true, visitorHash: true, createdAt: true },
  });

  const totalVisits = views.length;
  const uniqueVisitors = new Set(views.map((v) => v.visitorHash)).size;

  // Today's numbers
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayViews = views.filter((v) => v.createdAt >= todayStart);
  const todayUnique = new Set(todayViews.map((v) => v.visitorHash)).size;

  // Per-day series
  const days: { key: string; label: string; value: number }[] = [];
  for (let i = rangeDays - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    days.push({ key: dayKey(d), label: `${d.getMonth() + 1}/${d.getDate()}`, value: 0 });
  }
  const dayMap = new Map(days.map((d) => [d.key, d]));
  for (const v of views) {
    const d = dayMap.get(dayKey(new Date(v.createdAt)));
    if (d) d.value += 1;
  }

  // Top pages
  const pageCounts = new Map<string, { visits: number; visitors: Set<string> }>();
  for (const v of views) {
    let e = pageCounts.get(v.path);
    if (!e) {
      e = { visits: 0, visitors: new Set() };
      pageCounts.set(v.path, e);
    }
    e.visits += 1;
    e.visitors.add(v.visitorHash);
  }
  const topPages = [...pageCounts.entries()]
    .map(([path, e]) => ({ path, visits: e.visits, visitors: e.visitors.size }))
    .sort((a, b) => b.visits - a.visits)
    .slice(0, 15);
  const maxVisits = topPages[0]?.visits ?? 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionTitle title="Visitors" subtitle="Who visits your store and what they open — anonymous, privacy-safe." />
        <div className="flex gap-2">
          {RANGES.map((r) => (
            <Link
              key={r}
              href={`/admin/visitors?range=${r}`}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                rangeDays === r
                  ? "bg-orange-500 text-white shadow"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
              }`}
            >
              {r}d
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi label="Total visits" value={totalVisits.toLocaleString()} sub={`Last ${rangeDays} days`} tone="text-orange-600" />
        <Kpi label="Unique visitors" value={uniqueVisitors.toLocaleString()} sub={`Last ${rangeDays} days (approx.)`} tone="text-violet-600" />
        <Kpi label="Visits today" value={todayViews.length.toLocaleString()} sub="Since midnight" tone="text-sky-600" />
        <Kpi label="Visitors today" value={todayUnique.toLocaleString()} sub="Unique, approx." tone="text-emerald-600" />
      </div>

      <div className={cardCls + " p-5"}>
        <h3 className="mb-3 text-sm font-bold text-zinc-800">Visits per day</h3>
        {totalVisits === 0 ? (
          <p className="py-8 text-center text-sm text-zinc-400">
            No visits recorded yet. Tracking started — visit the storefront and check back.
          </p>
        ) : (
          <BarChart data={days} height={180} color="#f97316" />
        )}
      </div>

      <div className={cardCls + " p-5"}>
        <h3 className="mb-3 text-sm font-bold text-zinc-800">Most opened pages</h3>
        {topPages.length === 0 ? (
          <p className="py-8 text-center text-sm text-zinc-400">No page data yet.</p>
        ) : (
          <div className="space-y-3">
            {topPages.map((p) => (
              <div key={p.path}>
                <div className="mb-1 flex items-baseline justify-between gap-3">
                  <span className="truncate font-mono text-sm font-semibold text-zinc-800" title={p.path}>
                    {p.path}
                  </span>
                  <span className="shrink-0 text-xs text-zinc-500">
                    {p.visits.toLocaleString()} visits · {p.visitors.toLocaleString()} visitors
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400"
                    style={{ width: `${Math.max(4, (p.visits / maxVisits) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-zinc-400">
        Privacy note: visits are counted anonymously — only a daily-rotating hash is stored, never raw IP
        addresses. Admin and API traffic is excluded.
      </p>
    </div>
  );
}
