export const dynamic = "force-dynamic";

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import AddressManager from "./AddressManager";

export default async function AddressesPage() {
  const user = await requireUser();
  const addresses = await db.address.findMany({
    where: { userId: user.id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });
  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-zinc-900">Saved addresses</h1>
      <AddressManager initial={addresses} />
    </main>
  );
}
