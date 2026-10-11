export const dynamic = "force-dynamic";

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import EmptyState from "@/components/EmptyState";
import ProductCard from "@/components/ProductCard";
import RemoveWishlistButton from "./RemoveWishlistButton";

export default async function AccountWishlistPage() {
  const user = await requireUser();
  const items = await db.wishlistItem.findMany({
    where: { userId: user.id },
    include: { product: true },
    orderBy: { createdAt: "desc" },
  });

  if (items.length === 0) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-12">
        <EmptyState
          title="Your wishlist is empty"
          message="Save products you love and find them here later."
          actionHref="/search"
          actionLabel="Discover products"
        />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-zinc-900">Wishlist</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((i) => (
          <div key={i.id} className="relative">
            <ProductCard
              product={{
                slug: i.product.slug,
                name: i.product.name,
                priceCents: i.product.priceCents,
                originalPriceCents: i.product.originalPriceCents,
                images: (Array.isArray(i.product.images) ? i.product.images : []) as string[],
                rating: i.product.rating,
                reviewCount: i.product.reviewCount,
              }}
            />
            <div className="mt-2 text-center">
              <RemoveWishlistButton productId={i.productId} />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
