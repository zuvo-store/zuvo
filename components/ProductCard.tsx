import Link from "next/link";
import { discountPct } from "@/lib/money";
import Price from "@/components/Price";
import RatingStars from "@/components/RatingStars";

export type ProductCardProduct = {
  slug: string;
  name: string;
  priceCents: number;
  originalPriceCents?: number | null;
  images: string[];
  rating: number;
  reviewCount: number;
};

export default function ProductCard({ product }: { product: ProductCardProduct }) {
  const image = product.images[0] ?? "/p/placeholder.svg";
  const pct = discountPct(product.priceCents, product.originalPriceCents);
  const href = `/product/${product.slug}`;

  return (
    <Link
      href={href}
      className="card-3d group flex h-full flex-col overflow-hidden rounded-2xl border border-zinc-100 bg-white shadow-sm"
    >
      <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-zinc-50 to-zinc-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image}
          alt={product.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110 group-hover:rotate-1"
        />
        {/* shimmer sweep on hover */}
        <span aria-hidden="true" className="shimmer pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        {pct != null ? (
          <span className="badge-3d absolute left-2.5 top-2.5 rounded-full bg-gradient-to-br from-orange-500 to-red-500 px-2.5 py-1 text-xs font-extrabold text-white">
            -{pct}%
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-zinc-900 transition-colors group-hover:text-orange-600">
          {product.name}
        </h3>
        <span className="flex items-center gap-1.5">
          <RatingStars rating={product.rating} size={14} />
          <span className="text-xs text-zinc-500">({product.reviewCount})</span>
        </span>
        <span className="mt-auto pt-1">
          <Price cents={product.priceCents} originalCents={product.originalPriceCents} />
        </span>
      </div>
    </Link>
  );
}
