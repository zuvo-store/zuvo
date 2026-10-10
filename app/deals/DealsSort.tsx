"use client";

import { useRouter } from "next/navigation";
import { SORT_OPTIONS } from "@/app/_shop/query";
import { inputCls } from "@/components/ui";

export default function DealsSort({ value }: { value: string }) {
  const router = useRouter();
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="font-medium text-zinc-700">Sort by</span>
      <select
        className={inputCls}
        value={value}
        onChange={(e) => {
          const v = e.target.value;
          router.push(v ? `/deals?sort=${encodeURIComponent(v)}` : "/deals");
        }}
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
