"use client";

import { btnSm } from "@/components/ui";

export default function DeletePromotionButton({
  id,
  label,
  action,
}: {
  id: string;
  label: string;
  action: (formData: FormData) => void;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(`Delete promotion ${label}?`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className={`${btnSm} rounded-lg border border-red-200 px-3 py-1.5 text-xs font-bold text-red-600 transition hover:bg-red-50`}
      >
        Delete
      </button>
    </form>
  );
}
