"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { inputCls, btn } from "@/components/ui";

export type SavedAddress = {
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

type Props = {
  initialContact: { name: string; email: string; phone: string };
  initialAddress: {
    country: string;
    state: string;
    city: string;
    street: string;
    apartment: string;
    postalCode: string;
  };
  savedAddresses: SavedAddress[];
  initialDeliveryMethod: "STANDARD" | "EXPRESS";
  initialPromoCode: string;
};

const fieldLabel = "mb-1 block text-sm font-medium text-zinc-700";
const sectionTitle = "mb-4 text-lg font-semibold text-zinc-900";

export default function CheckoutForm({
  initialContact,
  initialAddress,
  savedAddresses,
  initialDeliveryMethod,
  initialPromoCode,
}: Props) {
  const router = useRouter();
  const [contact, setContact] = useState(initialContact);
  const [address, setAddress] = useState(initialAddress);
  const [method, setMethod] = useState<"STANDARD" | "EXPRESS">(initialDeliveryMethod);
  const [promoCode, setPromoCode] = useState(initialPromoCode);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setC = (k: keyof typeof contact) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setContact((c) => ({ ...c, [k]: e.target.value }));
  const setA = (k: keyof typeof address) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setAddress((a) => ({ ...a, [k]: e.target.value }));

  function loadSaved(id: string) {
    const found = savedAddresses.find((a) => a.id === id);
    if (!found) return;
    setAddress({
      country: found.country,
      state: found.state,
      city: found.city,
      street: found.street,
      apartment: found.apartment ?? "",
      postalCode: found.postalCode,
    });
    setContact((c) => ({ ...c, name: c.name || found.fullName, phone: c.phone || found.phone || "" }));
  }

  async function postJson(url: string, body: unknown): Promise<{ ok: boolean; error?: string }> {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return (await res.json().catch(() => ({ ok: false, error: "Network error." }))) as {
      ok: boolean;
      error?: string;
    };
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const c = await postJson("/api/checkout/contact", {
        name: contact.name,
        email: contact.email,
        phone: contact.phone || undefined,
      });
      if (!c.ok) {
        setError(c.error ?? "Could not save contact info.");
        return;
      }
      const s = await postJson("/api/checkout/shipping", {
        country: address.country,
        state: address.state,
        city: address.city,
        street: address.street,
        apartment: address.apartment || undefined,
        postalCode: address.postalCode,
      });
      if (!s.ok) {
        setError(s.error ?? "Could not save shipping address.");
        return;
      }
      const d = await postJson("/api/checkout/delivery", {
        method,
        promoCode: promoCode.trim() || undefined,
      });
      if (!d.ok) {
        setError(d.error ?? "Could not save delivery method.");
        return;
      }
      router.push("/checkout/review");
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className={sectionTitle}>Contact information</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="co-name" className={fieldLabel}>Full name</label>
            <input id="co-name" className={inputCls} value={contact.name} onChange={setC("name")}
              autoComplete="name" required disabled={pending} />
          </div>
          <div>
            <label htmlFor="co-email" className={fieldLabel}>Email</label>
            <input id="co-email" type="email" className={inputCls} value={contact.email} onChange={setC("email")}
              autoComplete="email" required disabled={pending} />
          </div>
          <div>
            <label htmlFor="co-phone" className={fieldLabel}>Phone (optional)</label>
            <input id="co-phone" type="tel" className={inputCls} value={contact.phone} onChange={setC("phone")}
              autoComplete="tel" disabled={pending} />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className={sectionTitle + " mb-0"}>Shipping address</h2>
          {savedAddresses.length > 0 && (
            <select
              aria-label="Load a saved address"
              className={`${inputCls} w-auto`}
              defaultValue=""
              onChange={(e) => e.target.value && loadSaved(e.target.value)}
              disabled={pending}
            >
              <option value="">Load saved address…</option>
              {savedAddresses.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label} — {a.street}, {a.city}
                  {a.isDefault ? " (default)" : ""}
                </option>
              ))}
            </select>
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="co-country" className={fieldLabel}>Country</label>
            <input id="co-country" className={inputCls} value={address.country} onChange={setA("country")}
              autoComplete="country-name" required disabled={pending} />
          </div>
          <div>
            <label htmlFor="co-state" className={fieldLabel}>State / Province</label>
            <input id="co-state" className={inputCls} value={address.state} onChange={setA("state")}
              autoComplete="address-level1" required disabled={pending} />
          </div>
          <div>
            <label htmlFor="co-city" className={fieldLabel}>City</label>
            <input id="co-city" className={inputCls} value={address.city} onChange={setA("city")}
              autoComplete="address-level2" required disabled={pending} />
          </div>
          <div>
            <label htmlFor="co-postal" className={fieldLabel}>Postal code</label>
            <input id="co-postal" className={inputCls} value={address.postalCode} onChange={setA("postalCode")}
              autoComplete="postal-code" required disabled={pending} />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="co-street" className={fieldLabel}>Street address</label>
            <input id="co-street" className={inputCls} value={address.street} onChange={setA("street")}
              autoComplete="street-address" required disabled={pending} />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="co-apt" className={fieldLabel}>Apartment, suite, etc. (optional)</label>
            <input id="co-apt" className={inputCls} value={address.apartment} onChange={setA("apartment")}
              disabled={pending} />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className={sectionTitle}>Delivery method</h2>
        <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Delivery method">
          {(
            [
              { value: "STANDARD", title: "Standard", price: "$4.99 · FREE on orders over $50", time: "5–8 business days (illustrative)" },
              { value: "EXPRESS", title: "Express", price: "$12.99", time: "2–4 business days (illustrative)" },
            ] as const
          ).map((opt) => (
            <label
              key={opt.value}
              className={`cursor-pointer rounded-xl border p-4 transition ${
                method === opt.value
                  ? "border-orange-500 bg-orange-50 ring-1 ring-orange-500"
                  : "border-zinc-200 hover:border-zinc-300"
              }`}
            >
              <input
                type="radio"
                name="delivery-method"
                className="sr-only"
                checked={method === opt.value}
                onChange={() => setMethod(opt.value)}
                disabled={pending}
              />
              <span className="block font-semibold text-zinc-900">{opt.title}</span>
              <span className="block text-sm text-zinc-600">{opt.price}</span>
              <span className="block text-xs text-zinc-500">{opt.time}</span>
            </label>
          ))}
        </div>
        <div className="mt-4">
          <label htmlFor="co-promo" className={fieldLabel}>Promo code (optional)</label>
          <input
            id="co-promo"
            className={`${inputCls} uppercase`}
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value)}
            placeholder="e.g. WELCOME10"
            disabled={pending}
          />
          <p className="mt-1 text-xs text-zinc-500">Applied to your order at review time.</p>
        </div>
      </section>

      <button type="submit" className={`${btn} w-full sm:w-auto`} disabled={pending}>
        {pending ? "Saving…" : "Continue to review"}
      </button>
    </form>
  );
}
