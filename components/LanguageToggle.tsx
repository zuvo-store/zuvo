"use client";
import { useState } from "react";
import { LOCALE_COOKIE, type Locale } from "@/lib/i18n";

/** EN / اردو toggle — sets a cookie and reloads so the whole page re-renders in the new language. */
export default function LanguageToggle({ initial }: { initial: Locale }) {
  const [locale, setLocale] = useState<Locale>(initial);

  function switchTo(next: Locale) {
    if (next === locale) return;
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${60 * 60 * 24 * 365}`;
    setLocale(next);
    window.location.reload();
  }

  return (
    <div className="flex items-center overflow-hidden rounded-full border border-zinc-200 text-xs font-bold">
      {(["en", "ur"] as Locale[]).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => switchTo(l)}
          className={`px-2.5 py-1.5 transition ${locale === l ? "bg-zinc-900 text-white" : "text-zinc-500 hover:bg-zinc-100"}`}
        >
          {l === "en" ? "EN" : "اردو"}
        </button>
      ))}
    </div>
  );
}
