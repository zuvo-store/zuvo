/** Money is stored as integer cents everywhere. */

export function formatUSD(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  return `${sign}$${(abs / 100).toFixed(2)}`;
}

export function discountPct(priceCents: number, originalCents?: number | null): number | null {
  if (!originalCents || originalCents <= priceCents) return null;
  return Math.round(((originalCents - priceCents) / originalCents) * 100);
}

export function toCents(dollars: number): number {
  return Math.round(dollars * 100);
}
