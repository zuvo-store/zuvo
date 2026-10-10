"use client";

import "./globals.css";

export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white font-sans text-zinc-900 antialiased">
        <div className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-4 py-16 text-center">
          <p className="text-7xl font-extrabold tracking-tight text-brand-600">500</p>
          <h1 className="mt-4 text-2xl font-bold text-zinc-900">Something went wrong</h1>
          <p className="mt-2 text-sm text-zinc-500">
            A critical error occurred. Please reload the page.
            {error.digest ? (
              <span className="mt-1 block text-xs text-zinc-400">
                Error reference: {error.digest}
              </span>
            ) : null}
          </p>
          <div className="mt-6">
            <button
              type="button"
              onClick={() => retry()}
              className="inline-flex items-center justify-center rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-brand-700"
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
