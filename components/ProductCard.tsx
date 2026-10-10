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
      className="group flex h-full flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-square overflow-hidden bg-zinc-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image}
          alt={product.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        {pct != null ? (
          <span className="absolute left-2 top-2 rounded-full bg-brand-600 px-2 py-0.5 text-xs font-bold text-white">
            -{pct}%
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-3.5">
        <h3 className="line-clamp-2 text-sm font-medium leading-snug text-zinc-900 group-hover:text-brand-700">
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
