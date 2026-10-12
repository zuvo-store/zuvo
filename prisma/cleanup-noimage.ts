import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const all = await db.product.findMany({
    select: { id: true, name: true, slug: true, images: true },
  });

  // Products with no images
  const noImage = all.filter((p) => {
    const imgs = p.images;
    return !Array.isArray(imgs) || imgs.length === 0;
  });

  // QA test products (bulk upload testing)
  const testSlugs = new Set([
    "bulk-test-mouse",
    "bulk-test-keyboard",
    "premium-cotton-tshirt",
    "qa-test-headphones",
  ]);
  const testProducts = all.filter((p) => testSlugs.has(p.slug));

  // Union of both sets
  const toDelete = new Map<string, (typeof all)[number]>();
  for (const p of noImage) toDelete.set(p.id, p);
  for (const p of testProducts) toDelete.set(p.id, p);

  console.log(`Total products: ${all.length}`);
  console.log(`To delete: ${toDelete.size}`);
  for (const p of toDelete.values()) {
    console.log(`  - ${p.name} (${p.slug})`);
  }

  // Delete variants first (cascade should handle, but be explicit), then products
  const ids = [...toDelete.keys()];
  if (ids.length > 0) {
    await db.productVariant.deleteMany({ where: { productId: { in: ids } } });
    const result = await db.product.deleteMany({ where: { id: { in: ids } } });
    console.log(`Deleted ${result.count} products.`);
  } else {
    console.log("Nothing to delete.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
