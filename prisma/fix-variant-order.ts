/**
 * One-off fix: reorder voltcore-aurabuds variants so "Onyx Black" (matching
 * the product image) is the default selected variant.
 * Run via GitHub Actions (db-fix workflow).
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const product = await db.product.findUnique({
    where: { slug: "voltcore-aurabuds" },
    include: { variants: { orderBy: { id: "asc" } } },
  });
  if (!product) {
    console.log("Product not found");
    return;
  }
  console.log(
    "Current order:",
    product.variants.map((v) => v.value)
  );

  // Desired order: Onyx Black first (matches product image), then others.
  const desired = ["Onyx Black", "Arctic White", "Pacific Blue"];
  const byValue = new Map(product.variants.map((v) => [v.value, v]));

  // Use updatedAt as a tiebreaker ordering hack: touch variants in reverse
  // desired order so their IDs... no — IDs are cuid, can't reorder by ID.
  // Instead, delete and recreate in the right order (preserves data).
  const variantData = desired
    .map((value) => byValue.get(value))
    .filter((v): v is (typeof product.variants)[number] => !!v);

  if (variantData.length !== product.variants.length) {
    console.log("Variant mismatch, aborting");
    return;
  }

  await db.$transaction(async (tx) => {
    await tx.productVariant.deleteMany({ where: { productId: product.id } });
    for (const v of variantData) {
      await tx.productVariant.create({
        data: {
          productId: product.id,
          name: v.name,
          value: v.value,
          sku: v.sku,
          stock: v.stock,
          priceDeltaCents: v.priceDeltaCents,
        },
      });
    }
  });

  const updated = await db.product.findUnique({
    where: { slug: "voltcore-aurabuds" },
    include: { variants: { orderBy: { id: "asc" } } },
  });
  console.log(
    "New order:",
    updated?.variants.map((v) => v.value)
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
