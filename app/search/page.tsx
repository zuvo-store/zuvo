export const dynamic = "force-dynamic";
import Link from "next/link";
import { db } from "@/lib/db";
import { dollarsToCentsParam, queryProducts, toListItem } from "@/app/_shop/query";
import { aiRankProducts } from "@/lib/ai-search";
import InfiniteProductGrid from "@/components/InfiniteProductGrid";
import EmptyState from "@/components/EmptyState";
import { SectionTitle } from "@/components/ui";
import SearchFilters from "./SearchFilters";

export const metadata = { title: "Search — ZUVO" };

type SearchParams = {
  q?: string;
  category?: string;
  minPrice?: string;
  maxPrice?: string;
  sort?: string;
  page?: string;
  ai?: string;
};

function paramsWithout(sp: SearchParams, remove: keyof SearchParams): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (k === remove || k === "page" || v == null || v === "") continue;
    params.set(k, v);
  }
  const s = params.toString();
  return s ? `/search?${s}` : "/search";
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const aiMode = sp.ai === "1" && !!sp.q?.trim();

  const [categories, result] = await Promise.all([
    db.category.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
      select: { slug: true, name: true },
    }),
    (async () => {
      if (!aiMode) {
        return queryProducts(
          {
            q: sp.q,
            categorySlug: sp.category,
            minCents: dollarsToCentsParam(sp.minPrice),
            maxCents: dollarsToCentsParam(sp.maxPrice),
            sort: sp.sort,
          },
          page,
          24
        );
      }
      // ✨ AI Smart search: rank by meaning/intent via Groq, fall back to keyword on failure.
      let ids: string[] = [];
      try {
        ids = await aiRankProducts(sp.q!.trim());
      } catch {
        ids = [];
      }
      if (ids.length === 0) {
        return queryProducts({ q: sp.q, categorySlug: sp.category }, page, 24);
      }
      const rows = await db.product.findMany({ where: { id: { in: ids }, active: true } });
      const byId = new Map(rows.map((p) => [p.id, p]));
      const ordered = ids.map((id) => byId.get(id)).filter((p) => !!p).map((p) => toListItem(p!));
      return { items: ordered, total: ordered.length, totalPages: 1, page: 1, perPage: 24 };
    })(),
  ]);

  const categoryName = sp.category
    ? categories.find((c) => c.slug === sp.category)?.name
    : undefined;

  const chips: { label: string; href: string }[] = [];
  if (sp.q) chips.push({ label: `“${sp.q}”`, href: paramsWithout(sp, "q") });
  if (sp.category)
    chips.push({ label: categoryName ?? sp.category, href: paramsWithout(sp, "category") });
  if (sp.minPrice)
    chips.push({ label: `Min $${sp.minPrice}`, href: paramsWithout(sp, "minPrice") });
  if (sp.maxPrice)
    chips.push({ label: `Max $${sp.maxPrice}`, href: paramsWithout(sp, "maxPrice") });

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <SectionTitle
        title={sp.q ? `Results for “${sp.q}”` : "Search products"}
        subtitle={
          result.total === 0
            ? undefined
            : `${result.total} product${result.total === 1 ? "" : "s"} found${aiMode ? " · ✨ AI Smart ranked" : ""}`
        }
      />

      <div className="mt-6">
        <SearchFilters
          initial={{
            q: sp.q ?? "",
            category: sp.category ?? "",
            minPrice: sp.minPrice ?? "",
            maxPrice: sp.maxPrice ?? "",
            sort: sp.sort ?? "",
          }}
          categories={categories}
        />
        {sp.q?.trim() && (
          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs font-semibold text-zinc-500">Search mode:</span>
            <Link
              href={paramsWithout(sp, "ai")}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                !aiMode ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
              }`}
            >
              🔍 Keyword
            </Link>
            <Link
              href={`/search?${new URLSearchParams({ ...Object.fromEntries(Object.entries(sp).filter(([, v]) => v != null && v !== "")), ai: "1" }).toString()}`}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                aiMode
                  ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
              }`}
            >
              ✨ AI Smart
            </Link>
          </div>
        )}
      </div>

      {chips.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {chips.map((chip) => (
            <Link
              key={chip.label}
              href={chip.href}
              className="inline-flex items-center gap-1 rounded-full bg-zinc-900 px-3 py-1 text-xs font-medium text-white hover:bg-zinc-700"
            >
              {chip.label}
              <span aria-hidden="true">×</span>
            </Link>
          ))}
          <Link href="/search" className="text-xs font-semibold text-orange-600 hover:underline">
            Clear all
          </Link>
        </div>
      )}

      {result.items.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No products found"
            message="Try a different keyword, remove a filter, or browse everything."
            actionHref="/search"
            actionLabel="Clear filters"
          />
        </div>
      ) : (
        <InfiniteProductGrid
          initialItems={result.items}
          initialPage={result.page}
          totalPages={result.totalPages}
          total={result.total}
          filters={{
            q: sp.q,
            categorySlug: sp.category,
            minCents: dollarsToCentsParam(sp.minPrice) ?? undefined,
            maxCents: dollarsToCentsParam(sp.maxPrice) ?? undefined,
            sort: sp.sort,
          }}
        />
      )}
    </div>
  );
}
