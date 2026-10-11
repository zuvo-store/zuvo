/**
 * One-off fix: backfill ProductVariant.sortOrder based on creation order
 * (id asc), so variants display in their seeded order instead of
 * alphabetically. Ensures voltcore-aurabuds defaults to "Onyx Black"
 * (matching its product image).
 * Run via GitHub Actions (db-fix workflow).
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const products = await db.product.findMany({
    select: { id: true, slug: true },
  });

  for (const p of products) {
    const variants = await db.productVariant.findMany({
      where: { productId: p.id },
      orderBy: { id: "asc" },
      select: { id: true, value: true },
    });
    for (let i = 0; i < variants.length; i++) {
      await db.productVariant.update({
        where: { id: variants[i].id },
        data: { sortOrder: i },
      });
    }
  }

  const check = await db.product.findUnique({
    where: { slug: "voltcore-aurabuds" },
    include: { variants: { orderBy: { sortOrder: "asc" } } },
  });
  console.log(
    "voltcore-aurabuds order:",
    check?.variants.map((v) => v.value)
  );
  console.log("Backfilled", products.length, "products");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
