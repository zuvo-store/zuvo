export const dynamic = "force-dynamic";
import Link from "next/link";
import { db } from "@/lib/db";
import { SectionTitle, cardCls, cardFlushCls } from "@/components/ui";

export const metadata = { title: "Categories — ZUVO" };

export default async function CategoriesPage() {
  const categories = await db.category.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
    include: {
      _count: { select: { products: { where: { active: true } } } },
      products: {
        where: { active: true },
        orderBy: { createdAt: "asc" },
        take: 1,
        select: { slug: true, images: true },
      },
    },
  });

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <SectionTitle
        title="All categories"
        subtitle="Browse every department in the ZUVO demo marketplace"
      />
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {categories.map((c) => {
          // Use the first product's real photo (all products have /p/<slug>.jpg).
          const firstProduct = c.products[0];
          const cardImage = firstProduct ? `/p/${firstProduct.slug}.jpg` : c.image;
          return (
            <Link
              key={c.id}
              href={`/category/${c.slug}`}
              className={`${cardFlushCls} group flex flex-col overflow-hidden transition hover:shadow-md`}
            >
              <div className="flex aspect-[16/9] items-center justify-center overflow-hidden bg-zinc-100">
                {cardImage ? (
                  <img
                    src={cardImage}
                    alt={c.name}
                    className="h-full w-full object-cover transition group-hover:scale-105"
                    loading="lazy"
                  />
                ) : (
                  <span className="text-5xl font-extrabold text-orange-500">
                    {c.name.charAt(0)}
                  </span>
                )}
              </div>
              <div className="flex flex-1 flex-col p-5">
                <h2 className="text-lg font-semibold text-zinc-900 group-hover:text-orange-600">
                  {c.name}
                </h2>
                {c.description && (
                  <p className="mt-1 line-clamp-2 flex-1 text-sm text-zinc-500">{c.description}</p>
                )}
                <span className="mt-3 text-sm font-medium text-zinc-500">
                  {c._count.products} product{c._count.products === 1 ? "" : "s"}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
