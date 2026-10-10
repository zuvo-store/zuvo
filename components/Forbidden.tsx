import Link from "next/link";

export default function Forbidden() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-4 py-16 text-center">
      <p className="text-7xl font-extrabold tracking-tight text-brand-600">403</p>
      <h1 className="mt-4 text-2xl font-bold text-zinc-900">Access denied</h1>
      <p className="mt-2 text-sm text-zinc-500">
        You don&apos;t have permission to view this page.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-brand-700"
        >
          Go home
        </Link>
        <Link
          href="/auth/login"
          className="inline-flex items-center justify-center rounded-xl border border-zinc-300 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
        >
          Sign in
        </Link>
      </div>
    </div>
  );
}
