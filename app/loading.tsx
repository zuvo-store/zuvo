export default function Loading() {
  return (
    <div
      className="mx-auto flex min-h-[60vh] max-w-7xl items-center justify-center px-4 py-16"
      role="status"
      aria-label="Loading"
    >
      <div className="flex flex-col items-center gap-4">
        <div
          className="h-10 w-10 animate-spin rounded-full border-4 border-zinc-200 border-t-brand-600"
          aria-hidden="true"
        />
        <div className="w-64 space-y-3" aria-hidden="true">
          <div className="h-4 w-3/4 animate-pulse rounded bg-zinc-100" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-zinc-100" />
          <div className="h-4 w-2/3 animate-pulse rounded bg-zinc-100" />
        </div>
        <span className="sr-only">Loading…</span>
      </div>
    </div>
  );
}
