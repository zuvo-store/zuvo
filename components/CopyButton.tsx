"use client";

import { useState } from "react";

export default function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // fallback
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={copy}
      className={`shrink-0 rounded-xl px-4 py-2 text-xs font-extrabold shadow-sm transition active:scale-95 ${
        copied ? "bg-green-500 text-white" : "bg-zinc-900 text-white hover:bg-zinc-700"
      }`}
    >
      {copied ? "✓ Copied!" : "Copy"}
    </button>
  );
}
