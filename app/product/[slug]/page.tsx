export const dynamic = "force-dynamic";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { discountPct } from "@/lib/money";
import { productAttributes, productImages, toListItem } from "@/app/_shop/query";
import ProductCard from "@/components/ProductCard";
import RatingStars from "@/components/RatingStars";
import Price from "@/components/Price";
import WishlistButton from "@/components/WishlistButton";
import StockAlertBox from "@/components/StockAlertBox";
import StickyBuyBar from "@/components/StickyBuyBar";
import { SectionTitle, cardCls, cardFlushCls } from "@/components/ui";
import ProductGallery from "./ProductGallery";
import BuyPanel from "./BuyPanel";
import ReviewForm from "./ReviewForm";
import RecordView from "@/components/RecordView";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await db.product.findUnique({
    where: { slug },
    select: { name: true, shortDesc: true, active: true, seoTitle: true, seoDescription: true },
  });
  if (!product || !product.active) return { title: "Product — ZUVO" };
  return {
    title: product.seoTitle || `${product.name} — ZUVO`,
    description: product.seoDescription || product.shortDesc || undefined,
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await db.product.findUnique({
    where: { slug },
    include: {
      category: true,
      variants: { orderBy: [{ sortOrder: "asc" }, { name: "asc" }, { value: "asc" }] },
      reviews: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });
  if (!product || !product.active) notFound();

  const user = await getSessionUser();
  let wishlisted = false;
  if (user) {
    const w = await db.wishlistItem.findUnique({
      where: { userId_productId: { userId: user.id, productId: product.id } },
      select: { id: true },
    });
    wishlisted = Boolean(w);
  }

  const related = await db.product.findMany({
    where: { active: true, categoryId: product.categoryId, id: { not: product.id } },
    orderBy: [{ rating: "desc" }, { reviewCount: "desc" }],
    take: 4,
  });

  const images = productImages(product.images);
  const attributes = productAttributes(product.attributes);
  const pct = discountPct(product.priceCents, product.originalPriceCents);

  const variantStock = product.variants.reduce((s, v) => s + v.stock, 0);
  const inStock =
    product.variants.length > 0 ? variantStock > 0 : product.stock > 0;
  const lowStock =
    product.variants.length === 0 && product.stock > 0 && product.stock <= 10;
  const stockLabel = !inStock
    ? "Out of stock"
    : product.variants.length > 0
      ? "In stock — select an option"
      : lowStock
        ? `Only ${product.stock} left`
        : "In stock";

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-1.5 text-sm text-zinc-500">
        <Link href="/" className="hover:text-orange-600 hover:underline">Home</Link>
        <span aria-hidden="true">/</span>
        <Link href={`/categories/${product.category.slug}`} className="hover:text-orange-600 hover:underline">
          {product.category.name}
        </Link>
        <span aria-hidden="true">/</span>
        <span className="truncate font-medium text-zinc-800">{product.name}</span>
      </nav>
      <RecordView
        product={{
          slug: product.slug,
          name: product.name,
          image: images[0] ?? null,
          priceCents: product.priceCents,
        }}
      />
      <nav className="text-sm text-zinc-500">
        <Link href="/" className="hover:text-orange-600">
          Home
        </Link>
        <span className="mx-2">/</span>
        <Link href={`/category/${product.category.slug}`} className="hover:text-orange-600">
          {product.category.name}
        </Link>
        <span className="mx-2">/</span>
        <span className="font-medium text-zinc-900">{product.name}</span>
      </nav>

      <div className="mt-6 grid grid-cols-1 gap-10 lg:grid-cols-2">
        <ProductGallery images={images} name={product.name} />

        <div>
          {product.brand && (
            <p className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
              {product.brand}
            </p>
          )}
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-zinc-900">
            {product.name}
          </h1>

          <div className="mt-3 flex items-center gap-2">
            <RatingStars rating={product.rating} />
            <span className="text-sm text-zinc-500">
              {product.rating.toFixed(1)} · {product.reviewCount} review
              {product.reviewCount === 1 ? "" : "s"}
            </span>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <Price
              cents={product.priceCents}
              originalCents={product.originalPriceCents ?? undefined}
              className="text-3xl font-extrabold text-zinc-900"
            />
            {pct && (
              <span className="rounded-md bg-orange-100 px-2 py-1 text-sm font-bold text-orange-700">
                Save {pct}%
              </span>
            )}
          </div>

          <p
            className={`mt-3 text-sm font-semibold ${
              inStock ? "text-green-700" : "text-red-600"
            }`}
          >
            {stockLabel}
          </p>

          {product.shortDesc && (
            <p className="mt-4 leading-relaxed text-zinc-600">{product.shortDesc}</p>
          )}

          <div className="mt-6" id="buy-panel">
            <BuyPanel
              productId={product.id}
              basePriceCents={product.priceCents}
              productStock={product.stock}
              variants={product.variants.map((v) => ({
                id: v.id,
                name: v.name,
                value: v.value,
                priceDeltaCents: v.priceDeltaCents,
                stock: v.stock,
              }))}
            />
          </div>

          <div className="mt-4">
            <WishlistButton productId={product.id} initialActive={wishlisted} />
          </div>

          {!inStock && (
            <StockAlertBox productId={product.id} initialEmail={user?.email ?? ""} />
          )}

          <div className={`${cardCls} mt-6 p-5`}>
            <h2 className="font-semibold text-zinc-900">Delivery & returns</h2>
            <ul className="mt-2 space-y-1 text-sm text-zinc-600">
              <li>Standard delivery: 5–8 business days (illustrative).</li>
              <li>Express delivery: 2–4 business days (illustrative).</li>
              <li>Free standard shipping on orders over $50.</li>
            </ul>
            <p className="mt-3 text-sm text-zinc-600">
              Changed your mind? Demo returns are accepted within 30 days of delivery.
              See our <Link href="/returns" className="font-semibold text-orange-600 hover:underline">returns policy</Link>.
            </p>
          </div>
        </div>
      </div>

      {(Object.keys(attributes).length > 0 || product.description) && (
        <section className="mt-12">
          <SectionTitle title="Details" />
          {Object.keys(attributes).length > 0 && (
            <div className={`${cardFlushCls} mt-4 overflow-hidden`}>
              <table className="w-full text-sm">
                <tbody>
                  {Object.entries(attributes).map(([k, v]) => (
                    <tr key={k} className="border-b border-zinc-100 last:border-0">
                      <th className="w-1/3 bg-zinc-50 px-4 py-3 text-left font-medium text-zinc-600">
                        {k}
                      </th>
                      <td className="px-4 py-3 text-zinc-900">{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {product.description && (
            <div className="mt-4 whitespace-pre-line leading-relaxed text-zinc-700">
              {product.description}
            </div>
          )}
        </section>
      )}

      {related.length > 0 && (
        <section className="mt-12">
          <SectionTitle title="Related products" />
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={toListItem(p)} />
            ))}
          </div>
        </section>
      )}

      <section className="mt-12 mb-16">
        <SectionTitle
          title="Reviews"
          subtitle={
            product.reviewCount > 0
              ? `${product.reviewCount} verified demo review${product.reviewCount === 1 ? "" : "s"}`
              : "Be the first to review this product"
          }
        />
        <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div className="flex flex-col gap-4">
            {product.reviews.length === 0 && (
              <p className="text-sm text-zinc-500">
                No reviews yet. Share your experience with this demo product.
              </p>
            )}
            {product.reviews.map((r) => (
              <article key={r.id} className={`${cardCls} p-5`}>
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-zinc-900">{r.authorName}</p>
                  <p className="text-xs text-zinc-500">
                    {new Date(r.createdAt).toLocaleString("en-US")}
                  </p>
                </div>
                <div className="mt-1">
                  <RatingStars rating={r.rating} size={16} />
                </div>
                {r.title && (
                  <h3 className="mt-2 font-semibold text-zinc-900">{r.title}</h3>
                )}
                {r.body && <p className="mt-1 text-sm leading-relaxed text-zinc-600">{r.body}</p>}
              </article>
            ))}
          </div>
          <div>
            <div className={`${cardCls} p-5`}>
              <h3 className="font-semibold text-zinc-900">Write a review</h3>
              <div className="mt-4">
                {user ? (
                  <ReviewForm slug={product.slug} />
                ) : (
                  <p className="text-sm text-zinc-600">
                    Please{" "}
                    <Link
                      href={`/auth/login?next=${encodeURIComponent(`/product/${product.slug}`)}`}
                      className="font-semibold text-orange-600 hover:underline"
                    >
                      sign in
                    </Link>{" "}
                    to write a review.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
      <StickyBuyBar
        productName={product.name}
        priceCents={product.priceCents}
        image={productImages(product.images)[0] ?? "/p/placeholder.svg"}
      />
    </div>
  );
}
