"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function hrefFor(basePath: string, params: URLSearchParams, page: number) {
  const next = new URLSearchParams(params.toString());
  next.set("page", String(page));
  return `${basePath}?${next.toString()}`;
}

export default function Pagination({
  page,
  totalPages,
  basePath,
}: {
  page: number;
  totalPages: number;
  basePath: string;
}) {
  return (
    <Suspense fallback={null}>
      <PaginationInner page={page} totalPages={totalPages} basePath={basePath} />
    </Suspense>
  );
}

function PaginationInner({
  page,
  totalPages,
  basePath,
}: {
  page: number;
  totalPages: number;
  basePath: string;
}) {
  const searchParams = useSearchParams();
  if (totalPages <= 1) return null;

  const pages: number[] = [];
  const lo = Math.max(1, page - 2);
  const hi = Math.min(totalPages, page + 2);
  for (let p = lo; p <= hi; p++) pages.push(p);

  const itemCls = (active: boolean) =>
    `flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-sm font-semibold ${
      active
        ? "bg-brand-600 text-white"
        : "border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"
    }`;
  const disabledCls =
    "flex h-9 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-sm font-semibold text-zinc-400 cursor-not-allowed";

  return (
    <nav aria-label="Pagination" className="mt-8 flex items-center justify-center gap-1.5">
      {page > 1 ? (
        <Link scroll={false} href={hrefFor(basePath, searchParams, page - 1)} className={itemCls(false)} aria-label="Previous page">
          ←
        </Link>
      ) : (
        <span className={disabledCls} aria-hidden="true">
          ←
        </span>
      )}
      {lo > 1 ? (
        <>
          <Link scroll={false} href={hrefFor(basePath, searchParams, 1)} className={itemCls(false)} aria-label="Page 1">
            1
          </Link>
          <span className="px-1 text-zinc-400" aria-hidden="true">
            …
          </span>
        </>
      ) : null}
      {pages.map((p) =>
        p === page ? (
          <span key={p} className={itemCls(true)} aria-current="page">
            {p}
          </span>
        ) : (
          <Link scroll={false} key={p} href={hrefFor(basePath, searchParams, p)} className={itemCls(false)} aria-label={`Page ${p}`}>
            {p}
          </Link>
        ),
      )}
      {hi < totalPages ? (
        <>
          <span className="px-1 text-zinc-400" aria-hidden="true">
            …
          </span>
          <Link
            scroll={false}
            href={hrefFor(basePath, searchParams, totalPages)}
            className={itemCls(false)}
            aria-label={`Page ${totalPages}`}
          >
            {totalPages}
          </Link>
        </>
      ) : null}
      {page < totalPages ? (
        <Link scroll={false} href={hrefFor(basePath, searchParams, page + 1)} className={itemCls(false)} aria-label="Next page">
          →
        </Link>
      ) : (
        <span className={disabledCls} aria-hidden="true">
          →
        </span>
      )}
    </nav>
  );
}
