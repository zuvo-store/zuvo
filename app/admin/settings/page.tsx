export const dynamic = "force-dynamic";
import { getSetting, setSetting, getAllSettings } from "@/lib/settings";
import { audit } from "@/lib/audit";
import { getSessionUser, requireAdminPage} from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { btnPrimary, btnSecondary, inputCls, cardCls, Field, FormError, SectionTitle } from "@/components/ui";
import { qp, tableWrapCls, tableCls, thCls, tdCls, btnSm, type SearchParams } from "../_helpers";

async function saveAnnouncements(formData: FormData) {
  "use server";
  const me = await getSessionUser();
  const raw = String(formData.get("announcements") ?? "");
  const lines = raw.split("\n").map((s) => s.trim()).filter(Boolean);
  await setSetting("announcements", JSON.stringify(lines));
  await audit("setting.update", { actorId: me?.id, entity: "Setting", entityId: "announcements", meta: { count: lines.length } });
  revalidatePath("/admin/settings");
  redirect("/admin/settings?saved=1");
}

async function saveSetting(formData: FormData) {
  "use server";
  const me = await getSessionUser();
  const key = String(formData.get("key") ?? "").trim();
  const value = String(formData.get("value") ?? "");
  if (!key) redirect("/admin/settings?error=" + encodeURIComponent("Key is required."));
  await setSetting(key, value);
  await audit("setting.update", { actorId: me?.id, entity: "Setting", entityId: key });
  revalidatePath("/admin/settings");
  redirect("/admin/settings?saved=1");
}

async function addSetting(formData: FormData) {
  "use server";
  const me = await getSessionUser();
  const key = String(formData.get("key") ?? "").trim();
  const value = String(formData.get("value") ?? "");
  if (!key) redirect("/admin/settings?error=" + encodeURIComponent("Key is required."));
  if (!/^[a-z0-9_.-]+$/i.test(key)) {
    redirect("/admin/settings?error=" + encodeURIComponent("Key may only contain letters, numbers, dots, dashes and underscores."));
  }
  const existing = await getSetting(key, "__missing__");
  if (existing !== "__missing__") {
    redirect("/admin/settings?error=" + encodeURIComponent(`Setting "${key}" already exists — edit it below.`));
  }
  await setSetting(key, value);
  await audit("setting.create", { actorId: me?.id, entity: "Setting", entityId: key });
  revalidatePath("/admin/settings");
  redirect("/admin/settings?saved=1");
}

function parseAnnouncements(raw: string): string[] {
  try {
    const v = JSON.parse(raw) as unknown;
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

export default async function AdminSettingsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdminPage(); // must run before any data fetch (see lib/auth.ts)
  const sp = await searchParams;
  const all = await getAllSettings();
  const announcements = parseAnnouncements(all["announcements"] ?? "[]");
  const rest = Object.entries(all)
    .filter(([k]) => k !== "announcements")
    .sort(([a], [b]) => a.localeCompare(b));

  return (
    <div>
      <SectionTitle title="Settings" />
      <FormError message={qp(sp, "error")} />
      {qp(sp, "saved") ? (
        <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          Settings saved.
        </div>
      ) : null}

      <form action={saveAnnouncements} className={`${cardCls} mb-6 p-5`}>
        <h2 className="mb-1 text-base font-bold text-zinc-900">Announcement bar</h2>
        <p className="mb-3 text-sm text-zinc-500">
          One message per line. These rotate in the site header announcement bar.
        </p>
        <Field label="Announcements">
          <textarea name="announcements" rows={5} className={inputCls} defaultValue={announcements.join("\n")} />
        </Field>
        <button type="submit" className={`${btnPrimary} mt-4`}>
          Save announcements
        </button>
      </form>

      <h2 className="mb-3 text-lg font-bold text-zinc-900">All settings</h2>
      <div className={tableWrapCls}>
        <table className={tableCls}>
          <thead>
            <tr>
              <th className={thCls}>Key</th>
              <th className={thCls}>Value</th>
              <th className={thCls}>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {rest.map(([key, value]) => (
              <tr key={key} className="hover:bg-zinc-50">
                <td className={tdCls}><span className="font-mono text-xs font-semibold">{key}</span></td>
                <td className={tdCls} style={{ whiteSpace: "normal", minWidth: "240px" }}>
                  <form action={saveSetting} className="flex items-center gap-2">
                    <input type="hidden" name="key" value={key} />
                    <input name="value" defaultValue={value} className={inputCls} />
                    <button type="submit" className={`${btnSecondary} ${btnSm} shrink-0`}>
                      Save
                    </button>
                  </form>
                </td>
                <td className={tdCls}><span className="text-xs text-zinc-400">—</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <form action={addSetting} className={`${cardCls} mt-6 grid gap-4 p-5 sm:grid-cols-3`}>
        <h2 className="text-base font-bold text-zinc-900 sm:col-span-3">Add new setting</h2>
        <Field label="Key">
          <input name="key" required className={inputCls} placeholder="site_tagline" />
        </Field>
        <Field label="Value" className="sm:col-span-2">
          <input name="value" className={inputCls} placeholder="Value" />
        </Field>
        <div className="sm:col-span-3">
          <button type="submit" className={btnPrimary}>Add setting</button>
        </div>
      </form>
    </div>
  );
}
