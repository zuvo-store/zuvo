"use client";

import ConfirmForm from "@/components/ConfirmForm";
import { btnSm } from "@/app/admin/_helpers";

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
    <ConfirmForm
      action={action}
      title={`Delete promotion "${label}"?`}
      message="The promotion will be permanently removed and can no longer be used at checkout."
      confirmLabel="Yes, delete"
      danger
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className={`${btnSm} rounded-lg border border-red-200 px-3 py-1.5 text-xs font-bold text-red-600 transition hover:bg-red-50`}
      >
        Delete
      </button>
    </ConfirmForm>
  );
}
