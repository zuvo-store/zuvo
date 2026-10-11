export const dynamic = "force-dynamic";
import { queryProducts } from "@/app/_shop/query";
import ProductCard from "@/components/ProductCard";
import Pagination from "@/components/Pagination";
import EmptyState from "@/components/EmptyState";
import { SectionTitle } from "@/components/ui";
import DealsSort from "./DealsSort";
import FlashSaleCountdown from "@/components/FlashSaleCountdown";

export const metadata = { title: "Today's Deals — ZUVO" };

type SearchParams = { sort?: string; page?: string };

export default async function DealsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const result = await queryProducts({ deal: true, sort: sp.sort }, page, 24);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionTitle
          title="Today's Deals"
          subtitle="Discounted demo products — no real purchase required to explore"
        />
        <DealsSort value={sp.sort ?? ""} />
      </div>

      <FlashSaleCountdown />

      {result.items.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No deals right now"
            message="Check back soon — new demo deals land regularly."
            actionHref="/search"
            actionLabel="Browse all products"
          />
        </div>
      ) : (
        <>
          <div key={page} className="animate-page-slide mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {result.items.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
          <div className="mt-8 flex justify-center">
            <Pagination page={result.page} totalPages={result.totalPages} basePath="/deals" />
          </div>
        </>
      )}
    </div>
  );
}
