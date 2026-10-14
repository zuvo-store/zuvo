"use client";

import { useRouter } from "next/navigation";

/** Saves the voucher code for checkout, then takes the shopper home to start shopping. */
export default function UseVoucherButton({ code }: { code: string }) {
  const router = useRouter();

  function useNow() {
    try {
      localStorage.setItem("zuvo-pending-promo", code);
    } catch {
      /* storage unavailable — still navigate */
    }
    router.push("/");
  }

  return (
    <button
      type="button"
      onClick={useNow}
      className="w-full rounded-xl bg-orange-600 px-4 py-2.5 text-xs font-extrabold text-white shadow-sm transition hover:bg-orange-700 active:scale-95"
    >
      🎯 Use now
    </button>
  );
}
