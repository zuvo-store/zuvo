export const dynamic = "force-dynamic";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { toListItem } from "@/app/_shop/query";
import ProductCard from "@/components/ProductCard";
import WishlistButton from "@/components/WishlistButton";
import EmptyState from "@/components/EmptyState";
import { SectionTitle } from "@/components/ui";

export const metadata = { title: "Wishlist — ZUVO" };

export default async function WishlistPage() {
  const user = await requireUser("/wishlist");
  const items = await db.wishlistItem.findMany({
    where: { userId: user.id },
    include: { product: true },
    orderBy: { createdAt: "desc" },
  });
  const products = items
    .filter((i) => i.product.active)
    .map((i) => toListItem(i.product));

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <SectionTitle
        title="Your wishlist"
        subtitle={
          products.length > 0
            ? `${products.length} saved item${products.length === 1 ? "" : "s"}`
            : undefined
        }
      />

      {products.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="Your wishlist is empty"
            message="Save products you love and find them here later."
            actionHref="/search"
            actionLabel="Discover products"
          />
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => (
            <div key={p.id} className="relative">
              <ProductCard product={p} />
              <div className="absolute right-2 top-2">
                <WishlistButton productId={p.id} initialActive={true} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
