export const dynamic = "force-dynamic";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { dollarsToCentsParam, queryProducts } from "@/app/_shop/query";
import InfiniteProductGrid from "@/components/InfiniteProductGrid";
import EmptyState from "@/components/EmptyState";
import CategoryFilters from "./CategoryFilters";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const category = await db.category.findUnique({ where: { slug } });
  return {
    title: category ? `${category.name} — ZUVO` : "Category — ZUVO",
  };
}

type SearchParams = { q?: string; minPrice?: string; maxPrice?: string; sort?: string; page?: string };

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  const category = await db.category.findUnique({
    where: { slug },
    include: { _count: { select: { products: { where: { active: true } } } } },
  });
  if (!category || !category.active) notFound();

  const result = await queryProducts(
    {
      q: sp.q,
      categorySlug: slug,
      minCents: dollarsToCentsParam(sp.minPrice),
      maxCents: dollarsToCentsParam(sp.maxPrice),
      sort: sp.sort,
    },
    page,
    24
  );

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <nav className="text-sm text-zinc-500">
        <Link href="/" className="hover:text-orange-600">
          Home
        </Link>
        <span className="mx-2">/</span>
        <Link href="/categories" className="hover:text-orange-600">
          Categories
        </Link>
        <span className="mx-2">/</span>
        <span className="font-medium text-zinc-900">{category.name}</span>
      </nav>

      <div className="mt-4 flex items-start gap-5">
        {category.image && (
          <img
            src={category.image}
            alt=""
            aria-hidden="true"
            className="hidden h-20 w-20 rounded-xl object-cover sm:block"
          />
        )}
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900">
            {category.name}
          </h1>
          {category.description && (
            <p className="mt-1 max-w-2xl text-zinc-600">{category.description}</p>
          )}
          <p className="mt-1 text-sm text-zinc-500">
            {result.total} product{result.total === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      <div className="mt-6">
        <CategoryFilters
          slug={slug}
          initial={{
            q: sp.q ?? "",
            minPrice: sp.minPrice ?? "",
            maxPrice: sp.maxPrice ?? "",
            sort: sp.sort ?? "",
          }}
        />
      </div>

      {result.items.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="Nothing here yet"
            message="No products in this category match your filters."
            actionHref={`/category/${slug}`}
            actionLabel="Clear filters"
          />
        </div>
      ) : (
        <InfiniteProductGrid
          initialItems={result.items}
          initialPage={result.page}
          totalPages={result.totalPages}
          filters={{ categorySlug: slug, sort: sp.sort }}
        />
      )}
    </div>
  );
}
