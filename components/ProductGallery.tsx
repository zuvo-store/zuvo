"use client";

import { useState } from "react";

export default function ProductGallery({
  images,
  name,
}: {
  images: string[];
  name: string;
}) {
  const list = images.length > 0 ? images : ["/p/placeholder.svg"];
  const [selected, setSelected] = useState(0);
  const current = list[Math.min(selected, list.length - 1)];

  return (
    <div className="flex flex-col gap-3">
      <div className="aspect-square overflow-hidden rounded-xl bg-zinc-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={current}
          alt={name}
          className="h-full w-full object-cover"
        />
      </div>
      {list.length > 1 ? (
        <div className="grid grid-cols-5 gap-2" role="listbox" aria-label="Product images">
          {list.map((src, i) => (
            <button
              key={src + i}
              type="button"
              role="option"
              aria-selected={i === selected}
              aria-label={`View image ${i + 1}`}
              onClick={() => setSelected(i)}
              className={`aspect-square overflow-hidden rounded-lg bg-zinc-100 ring-2 ring-offset-1 ${
                i === selected ? "ring-brand-600" : "ring-transparent hover:ring-zinc-300"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
