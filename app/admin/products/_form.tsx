"use client";

import { useEffect, useState } from "react";
import { btnPrimary, btnSecondary, inputCls, Field, labelCls, cardCls } from "@/components/ui";

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

export type CategoryOpt = { id: string; name: string };

export type VariantRow = {
  key: string;
  id?: string;
  name: string;
  value: string;
  priceDelta: string;
  stock: string;
  sku: string;
};

export type ProductInit = {
  name: string;
  slug: string;
  categoryId: string;
  brand: string;
  shortDesc: string;
  description: string;
  price: string;
  originalPrice: string;
  currency: string;
  stock: string;
  sku: string;
  images: string;
  attributes: string;
  featured: boolean;
  deal: boolean;
  active: boolean;
  variants: VariantRow[];
};

let rowSeq = 0;
function blankRow(): VariantRow {
  rowSeq += 1;
  return { key: `new-${Date.now()}-${rowSeq}`, name: "", value: "", priceDelta: "", stock: "", sku: "" };
}

function VariantsEditor({
  initial,
  onChange,
}: {
  initial: VariantRow[];
  onChange: (rows: VariantRow[]) => void;
}) {
  const [rows, setRows] = useState<VariantRow[]>(initial);
  const update = (next: VariantRow[]) => {
    setRows(next);
    onChange(next);
  };
  const setCell = (key: string, field: keyof VariantRow, value: string) =>
    update(rows.map((r) => (r.key === key ? { ...r, [field]: value } : r)));

  return (
    <div>
      {rows.length === 0 ? (
        <p className="text-sm text-zinc-500">
          No variants — stock is tracked on the product itself. Add rows for options like Size or Color.
        </p>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.key} className="grid grid-cols-2 gap-2 rounded-lg border border-zinc-200 p-2 sm:grid-cols-6">
              <input
                className={inputCls}
                placeholder="Name (Size)"
                value={r.name}
                onChange={(e) => setCell(r.key, "name", e.target.value)}
              />
              <input
                className={inputCls}
                placeholder="Value (XL)"
                value={r.value}
                onChange={(e) => setCell(r.key, "value", e.target.value)}
              />
              <input
                className={inputCls}
                placeholder="+$ (e.g. 5)"
                inputMode="decimal"
                value={r.priceDelta}
                onChange={(e) => setCell(r.key, "priceDelta", e.target.value)}
              />
              <input
                className={inputCls}
                placeholder="Stock"
                inputMode="numeric"
                value={r.stock}
                onChange={(e) => setCell(r.key, "stock", e.target.value)}
              />
              <input
                className={inputCls}
                placeholder="SKU"
                value={r.sku}
                onChange={(e) => setCell(r.key, "sku", e.target.value)}
              />
              <button
                type="button"
                className={`${btnSecondary} px-3 py-2 text-xs`}
                onClick={() => update(rows.filter((x) => x.key !== r.key))}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
      <button type="button" className={`${btnSecondary} mt-2 px-3 py-1.5 text-xs`} onClick={() => update([...rows, blankRow()])}>
        Add variant
      </button>
      <p className="mt-1 text-xs text-zinc-500">
        Price delta is in dollars added to the base price (use a negative number for a discount).
      </p>
    </div>
  );
}

export default function ProductForm({
  action,
  categories,
  initial,
  submitLabel,
}: {
  action: (formData: FormData) => Promise<void>;
  categories: CategoryOpt[];
  initial?: ProductInit;
  submitLabel: string;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(initial?.slug));
  const [variants, setVariants] = useState<VariantRow[]>(initial?.variants ?? []);

  useEffect(() => {
    if (!slugTouched) setSlug(slugify(name));
  }, [name, slugTouched]);

  const variantsJson = JSON.stringify(
    variants.map((v) => ({
      id: v.id,
      name: v.name,
      value: v.value,
      priceDelta: v.priceDelta,
      stock: v.stock,
      sku: v.sku,
    }))
  );

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="variantsJson" value={variantsJson} />

      <div className={`${cardCls} grid gap-4 p-5 sm:grid-cols-2`}>
        <Field label="Name" className="sm:col-span-2">
          <input
            name="name"
            required
            className={inputCls}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Product name"
          />
        </Field>
        <Field label="Slug" hint="Auto-generated from the name; you can edit it.">
          <input
            name="slug"
            className={inputCls}
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value);
            }}
            placeholder="product-slug"
          />
        </Field>
        <Field label="Category">
          <select name="categoryId" required className={inputCls} defaultValue={initial?.categoryId ?? ""}>
            <option value="" disabled>
              Select a category
            </option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Brand">
          <input name="brand" className={inputCls} defaultValue={initial?.brand ?? ""} placeholder="Brand name" />
        </Field>
        <Field label="SKU" hint="Optional unique stock-keeping unit.">
          <input name="sku" className={inputCls} defaultValue={initial?.sku ?? ""} placeholder="ZV-0001" />
        </Field>
        <Field label="Price (USD)">
          <input
            name="price"
            required
            inputMode="decimal"
            className={inputCls}
            defaultValue={initial?.price ?? ""}
            placeholder="49.99"
          />
        </Field>
        <Field label="Original price (USD)" hint="Shown struck-through when higher than price.">
          <input
            name="originalPrice"
            inputMode="decimal"
            className={inputCls}
            defaultValue={initial?.originalPrice ?? ""}
            placeholder="69.99"
          />
        </Field>
        <Field label="Currency">
          <input name="currency" className={inputCls} defaultValue={initial?.currency ?? "USD"} />
        </Field>
        <Field label="Stock" hint="Used when the product has no variants.">
          <input
            name="stock"
            inputMode="numeric"
            className={inputCls}
            defaultValue={initial?.stock ?? "0"}
          />
        </Field>
        <Field label="Short description" className="sm:col-span-2">
          <input
            name="shortDesc"
            className={inputCls}
            defaultValue={initial?.shortDesc ?? ""}
            placeholder="One-line summary"
          />
        </Field>
        <Field label="Description" className="sm:col-span-2">
          <textarea name="description" rows={5} className={inputCls} defaultValue={initial?.description ?? ""} />
        </Field>
        <Field label="Images" hint="Comma-separated /p/ paths, e.g. /p/item-1.svg, /p/item-2.svg" className="sm:col-span-2">
          <textarea name="images" rows={2} className={inputCls} defaultValue={initial?.images ?? ""} />
        </Field>
        <Field label="Attributes" hint='One per line as "key: value", e.g. Material: Cotton' className="sm:col-span-2">
          <textarea name="attributes" rows={3} className={inputCls} defaultValue={initial?.attributes ?? ""} />
        </Field>
        <div className="flex flex-wrap gap-6 sm:col-span-2">
          {(
            [
              ["featured", "Featured", initial?.featured],
              ["deal", "Today's deal", initial?.deal],
              ["active", "Active (visible in shop)", initial?.active ?? true],
            ] as const
          ).map(([field, label, checked]) => (
            <label key={field} className="flex items-center gap-2 text-sm font-medium text-zinc-700">
              <input type="checkbox" name={field} defaultChecked={checked} className="h-4 w-4 rounded border-zinc-300" />
              {label}
            </label>
          ))}
        </div>
      </div>

      <div className={cardCls + " p-5"}>
        <span className={`${labelCls} mb-2`}>Variants</span>
        <VariantsEditor initial={initial?.variants ?? []} onChange={setVariants} />
      </div>

      <button type="submit" className={btnPrimary}>
        {submitLabel}
      </button>
    </form>
  );
}
