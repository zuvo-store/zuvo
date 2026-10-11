"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { inputCls, btn, cardCls } from "@/components/ui";

export type AddressRow = {
  id: string;
  label: string;
  fullName: string;
  phone: string | null;
  country: string;
  state: string;
  city: string;
  street: string;
  apartment: string | null;
  postalCode: string;
  isDefault: boolean;
};

const EMPTY = {
  label: "Home",
  fullName: "",
  phone: "",
  country: "",
  state: "",
  city: "",
  street: "",
  apartment: "",
  postalCode: "",
  isDefault: false,
};

const fieldLabel = "mb-1 block text-sm font-medium text-zinc-700";

export default function AddressManager({ initial }: { initial: AddressRow[] }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(initial.length === 0);
  const [form, setForm] = useState(EMPTY);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));
  const setCheck = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, isDefault: e.target.checked }));

  function startAdd() {
    setForm(EMPTY);
    setEditingId(null);
    setAdding(true);
    setError(null);
  }

  function startEdit(a: AddressRow) {
    setForm({
      label: a.label,
      fullName: a.fullName,
      phone: a.phone ?? "",
      country: a.country,
      state: a.state,
      city: a.city,
      street: a.street,
      apartment: a.apartment ?? "",
      postalCode: a.postalCode,
      isDefault: a.isDefault,
    });
    setEditingId(a.id);
    setAdding(false);
    setError(null);
  }

  function cancel() {
    setAdding(false);
    setEditingId(null);
    setError(null);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const method = editingId ? "PUT" : "POST";
      const res = await fetch("/api/account/addresses", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(editingId ? { id: editingId } : {}),
          label: form.label,
          fullName: form.fullName,
          phone: form.phone || undefined,
          country: form.country,
          state: form.state,
          city: form.city,
          street: form.street,
          apartment: form.apartment || undefined,
          postalCode: form.postalCode,
          isDefault: form.isDefault,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Could not save the address.");
        return;
      }
      cancel();
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setPending(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this address?")) return;
    setError(null);
    try {
      const res = await fetch("/api/account/addresses", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) setError(data.error ?? "Could not delete the address.");
      else router.refresh();
    } catch {
      setError("Network error. Please try again.");
    }
  }

  const formOpen = adding || editingId !== null;

  return (
    <div>
      {error && (
        <p role="alert" className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        {initial.map((a) => (
          <div key={a.id} className={cardCls}>
            <div className="mb-2 flex items-center justify-between">
              <p className="font-semibold text-zinc-900">{a.label}</p>
              {a.isDefault && (
                <span className="rounded-full bg-orange-100 px-2.5 py-1 text-xs font-semibold text-orange-700">
                  Default
                </span>
              )}
            </div>
            <p className="text-sm text-zinc-700">{a.fullName}</p>
            <p className="text-sm text-zinc-700">{a.street}</p>
            {a.apartment && <p className="text-sm text-zinc-700">{a.apartment}</p>}
            <p className="text-sm text-zinc-700">
              {a.city}, {a.state} {a.postalCode}
            </p>
            <p className="text-sm text-zinc-700">{a.country}</p>
            {a.phone && <p className="text-sm text-zinc-700">{a.phone}</p>}
            <div className="mt-3 flex gap-3">
              <button
                type="button"
                onClick={() => startEdit(a)}
                className="text-sm font-medium text-orange-600 hover:text-orange-700"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => remove(a.id)}
                className="text-sm font-medium text-zinc-500 hover:text-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {!formOpen && (
        <button type="button" onClick={startAdd} className={btn}>
          Add new address
        </button>
      )}

      {formOpen && (
        <form onSubmit={save} className={`${cardCls} max-w-2xl`}>
          <h2 className="mb-4 text-lg font-semibold text-zinc-900">
            {editingId ? "Edit address" : "New address"}
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="addr-label" className={fieldLabel}>Label</label>
              <input id="addr-label" className={inputCls} value={form.label} onChange={set("label")}
                placeholder="Home, Work…" required disabled={pending} />
            </div>
            <div>
              <label htmlFor="addr-name" className={fieldLabel}>Full name</label>
              <input id="addr-name" className={inputCls} value={form.fullName} onChange={set("fullName")}
                autoComplete="name" required disabled={pending} />
            </div>
            <div>
              <label htmlFor="addr-phone" className={fieldLabel}>Phone (optional)</label>
              <input id="addr-phone" type="tel" className={inputCls} value={form.phone} onChange={set("phone")}
                autoComplete="tel" disabled={pending} />
            </div>
            <div>
              <label htmlFor="addr-country" className={fieldLabel}>Country</label>
              <input id="addr-country" className={inputCls} value={form.country} onChange={set("country")}
                autoComplete="country-name" required disabled={pending} />
            </div>
            <div>
              <label htmlFor="addr-state" className={fieldLabel}>State / Province</label>
              <input id="addr-state" className={inputCls} value={form.state} onChange={set("state")}
                autoComplete="address-level1" required disabled={pending} />
            </div>
            <div>
              <label htmlFor="addr-city" className={fieldLabel}>City</label>
              <input id="addr-city" className={inputCls} value={form.city} onChange={set("city")}
                autoComplete="address-level2" required disabled={pending} />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="addr-street" className={fieldLabel}>Street address</label>
              <input id="addr-street" className={inputCls} value={form.street} onChange={set("street")}
                autoComplete="street-address" required disabled={pending} />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="addr-apt" className={fieldLabel}>Apartment, suite, etc. (optional)</label>
              <input id="addr-apt" className={inputCls} value={form.apartment} onChange={set("apartment")}
                disabled={pending} />
            </div>
            <div>
              <label htmlFor="addr-postal" className={fieldLabel}>Postal code</label>
              <input id="addr-postal" className={inputCls} value={form.postalCode} onChange={set("postalCode")}
                autoComplete="postal-code" required disabled={pending} />
            </div>
            <div className="flex items-end pb-2">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-700">
                <input type="checkbox" checked={form.isDefault} onChange={setCheck}
                  disabled={pending} className="h-4 w-4 accent-orange-600" />
                Set as default address
              </label>
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <button type="submit" className={btn} disabled={pending}>
              {pending ? "Saving…" : editingId ? "Save changes" : "Add address"}
            </button>
            <button
              type="button"
              onClick={cancel}
              disabled={pending}
              className="rounded-xl border border-zinc-300 px-4 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
