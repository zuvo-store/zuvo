export const dynamic = "force-dynamic";
import Link from "next/link";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { getSessionUser, requireAdminPage} from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  btnPrimary,
  btnSecondary,
  inputCls,
  cardCls,
  Field,
  Badge,
  FormError,
  SectionTitle,
} from "@/components/ui";
import EmptyState from "@/components/EmptyState";
import { qp, tableWrapCls, tableCls, thCls, tdCls, btnDanger, btnSm, type SearchParams } from "../_helpers";

function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 120);
}

function parseCategory(fd: FormData) {
  const str = (k: string) => {
    const v = fd.get(k);
    return typeof v === "string" ? v.trim() : "";
  };
  const name = str("name");
  if (!name) throw new Error("Name is required.");
  const slug = str("slug") || slugify(name);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error("Slug must be lowercase letters, numbers and hyphens.");
  const sortRaw = str("sortOrder");
  const sortOrder = sortRaw === "" ? 0 : Number(sortRaw);
  if (!Number.isInteger(sortOrder)) throw new Error("Sort order must be an integer.");
  const image = str("image");
  if (image && !image.startsWith("/p/")) throw new Error('Image path must start with /p/.');
  return {
    name,
    slug,
    description: str("description") || null,
    image: image || null,
    sortOrder,
    active: fd.get("active") === "on",
  };
}

async function createCategory(formData: FormData) {
  "use server";
  const me = await getSessionUser();
  const outcome = await (async () => {
    try {
      const data = parseCategory(formData);
      const created = await db.category.create({ data });
      await audit("category.create", { actorId: me?.id, entity: "Category", entityId: created.id, meta: { slug: data.slug } });
      return { ok: true as const };
    } catch (e) {
      if (typeof e === "object" && e !== null && "code" in e && (e as { code?: unknown }).code === "P2002") {
        return { ok: false as const, error: "Slug is already in use." };
      }
      return { ok: false as const, error: e instanceof Error ? e.message : "Failed to create category." };
    }
  })();
  if (!outcome.ok) redirect("/admin/categories?error=" + encodeURIComponent(outcome.error));
  revalidatePath("/admin/categories");
}

async function updateCategory(formData: FormData) {
  "use server";
  const id = String(formData.get("id") ?? "");
  const me = await getSessionUser();
  const outcome = await (async () => {
    try {
      const data = parseCategory(formData);
      await db.category.update({ where: { id }, data });
      await audit("category.update", { actorId: me?.id, entity: "Category", entityId: id, meta: { slug: data.slug } });
      return { ok: true as const };
    } catch (e) {
      if (typeof e === "object" && e !== null && "code" in e && (e as { code?: unknown }).code === "P2002") {
        return { ok: false as const, error: "Slug is already in use." };
      }
      return { ok: false as const, error: e instanceof Error ? e.message : "Failed to update category." };
    }
  })();
  if (!outcome.ok) redirect(`/admin/categories?edit=${id}&error=` + encodeURIComponent(outcome.error));
  redirect("/admin/categories?saved=1");
}

async function deleteCategory(formData: FormData) {
  "use server";
  const id = String(formData.get("id") ?? "");
  const me = await getSessionUser();
  const count = await db.product.count({ where: { categoryId: id } });
  if (count > 0) {
    redirect("/admin/categories?error=" + encodeURIComponent(`Cannot delete: ${count} product(s) still use this category.`));
  }
  await db.category.delete({ where: { id } });
  await audit("category.delete", { actorId: me?.id, entity: "Category", entityId: id });
  revalidatePath("/admin/categories");
}

export default async function AdminCategoriesPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdminPage(); // must run before any data fetch (see lib/auth.ts)
  const sp = await searchParams;
  const editId = qp(sp, "edit");
  const categories = await db.category.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { products: true } } },
  });
  const editing = editId ? categories.find((c) => c.id === editId) ?? null : null;

  return (
    <div>
      <SectionTitle title="Categories" />
      <FormError message={qp(sp, "error")} />
      {qp(sp, "saved") ? (
        <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          Category saved.
        </div>
      ) : null}

      {editing ? (
        <form action={updateCategory} className={`${cardCls} mb-6 grid gap-4 p-5 sm:grid-cols-2`}>
          <input type="hidden" name="id" value={editing.id} />
          <h2 className="text-base font-bold text-zinc-900 sm:col-span-2">Edit category</h2>
          <Field label="Name">
            <input name="name" required className={inputCls} defaultValue={editing.name} />
          </Field>
          <Field label="Slug">
            <input name="slug" className={inputCls} defaultValue={editing.slug} />
          </Field>
          <Field label="Description" className="sm:col-span-2">
            <input name="description" className={inputCls} defaultValue={editing.description ?? ""} />
          </Field>
          <Field label="Image (/p/ path)">
            <input name="image" className={inputCls} defaultValue={editing.image ?? ""} placeholder="/p/cat-electronics.svg" />
          </Field>
          <Field label="Sort order">
            <input name="sortOrder" inputMode="numeric" className={inputCls} defaultValue={String(editing.sortOrder)} />
          </Field>
          <label className="flex items-center gap-2 self-end text-sm font-medium text-zinc-700">
            <input type="checkbox" name="active" defaultChecked={editing.active} className="h-4 w-4 rounded border-zinc-300" />
            Active
          </label>
          <div className="flex gap-2 sm:col-span-2">
            <button type="submit" className={btnPrimary}>Save changes</button>
            <Link href="/admin/categories" className={btnSecondary}>Cancel</Link>
          </div>
        </form>
      ) : (
        <form action={createCategory} className={`${cardCls} mb-6 grid gap-4 p-5 sm:grid-cols-3`}>
          <h2 className="text-base font-bold text-zinc-900 sm:col-span-3">New category</h2>
          <Field label="Name">
            <input name="name" required className={inputCls} placeholder="Electronics" />
          </Field>
          <Field label="Slug (optional)">
            <input name="slug" className={inputCls} placeholder="electronics" />
          </Field>
          <Field label="Image (/p/ path)">
            <input name="image" className={inputCls} placeholder="/p/cat-electronics.svg" />
          </Field>
          <Field label="Description" className="sm:col-span-2">
            <input name="description" className={inputCls} placeholder="Short description" />
          </Field>
          <Field label="Sort order">
            <input name="sortOrder" inputMode="numeric" className={inputCls} defaultValue="0" />
          </Field>
          <label className="flex items-center gap-2 self-end text-sm font-medium text-zinc-700">
            <input type="checkbox" name="active" defaultChecked className="h-4 w-4 rounded border-zinc-300" />
            Active
          </label>
          <div className="sm:col-span-3">
            <button type="submit" className={btnPrimary}>Create category</button>
          </div>
        </form>
      )}

      {categories.length === 0 ? (
        <EmptyState title="No categories" message="Create your first category above." />
      ) : (
        <div className={tableWrapCls}>
          <table className={tableCls}>
            <thead>
              <tr>
                <th className={thCls}>Name</th>
                <th className={thCls}>Slug</th>
                <th className={thCls}>Products</th>
                <th className={thCls}>Sort</th>
                <th className={thCls}>Active</th>
                <th className={thCls}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {categories.map((c) => (
                <tr key={c.id} className="hover:bg-zinc-50">
                  <td className={tdCls}>
                    <div className="flex items-center gap-3">
                      {c.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={c.image} alt="" className="h-9 w-9 rounded-lg border border-zinc-200 object-cover" />
                      ) : null}
                      <span className="font-medium text-zinc-900">{c.name}</span>
                    </div>
                  </td>
                  <td className={tdCls}>{c.slug}</td>
                  <td className={tdCls}>{c._count.products}</td>
                  <td className={tdCls}>{c.sortOrder}</td>
                  <td className={tdCls}>
                    <Badge tone={c.active ? "green" : "zinc"}>{c.active ? "active" : "hidden"}</Badge>
                  </td>
                  <td className={tdCls}>
                    <div className="flex gap-2">
                      <Link href={`/admin/categories?edit=${c.id}`} className={`${btnSecondary} ${btnSm}`}>
                        Edit
                      </Link>
                      <form action={deleteCategory} className="inline">
                        <input type="hidden" name="id" value={c.id} />
                        <button type="submit" className={`${btnDanger} ${btnSm}`}>
                          Delete
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
