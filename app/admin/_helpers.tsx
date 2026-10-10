// Tiny admin-local helpers: query-param reading, date formatting, table class
// strings, and a danger button variant (components/ui has no danger style).
// UI primitives (btnPrimary, inputCls, cardCls, Field, Badge, EmptyState)
// come from @/components/ui and @/components/EmptyState — do not duplicate.

export function qp(
  sp: Record<string, string | string[] | undefined>,
  key: string
): string | undefined {
  const v = sp[key];
  return Array.isArray(v) ? v[0] : v;
}

export function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-US");
}

export type StatusBadgeTone = "brand" | "green" | "red" | "amber" | "zinc" | "blue";

export function statusTone(s: string): StatusBadgeTone {
  switch (s) {
    case "SUCCEEDED":
    case "DELIVERED":
    case "CONFIRMED":
    case "ACTIVE":
    case "AVAILABLE":
    case "ELIGIBLE":
      return "green";
    case "PENDING":
    case "PENDING_PAYMENT":
    case "PROCESSING":
    case "SHIPPED":
    case "CLAIMED":
      return "amber";
    case "DECLINED":
    case "FAILED":
    case "CANCELLED":
    case "REJECTED":
    case "EXPIRED":
    case "REVERSED":
      return "red";
    case "DRAFT":
    case "REFUNDED":
    case "PAUSED":
      return "blue";
    default:
      return "zinc";
  }
}

export const btnDanger =
  "inline-flex items-center justify-center gap-1.5 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50";
export const btnSm = "px-3 py-1.5 text-xs";

export const tableWrapCls =
  "overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm";
export const tableCls = "min-w-full divide-y divide-zinc-200 text-sm";
export const thCls =
  "whitespace-nowrap bg-zinc-50 px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500";
export const tdCls = "whitespace-nowrap px-3 py-2.5 align-middle text-zinc-800";

export type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export function pageNumber(sp: Record<string, string | string[] | undefined>): number {
  const n = Number(qp(sp, "page"));
  return Number.isInteger(n) && n > 0 ? n : 1;
}
