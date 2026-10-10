"use client";

import { useState } from "react";

export default function ProductGallery({
  images,
  name,
}: {
  images: string[];
  name: string;
}) {
  const [active, setActive] = useState(0);

  if (images.length === 0) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-2xl bg-zinc-100">
        <span className="text-6xl font-extrabold text-zinc-300">{name.charAt(0)}</span>
      </div>
    );
  }

  return (
    <div>
      <div className="flex aspect-square items-center justify-center overflow-hidden rounded-2xl bg-zinc-100">
        <img
          src={images[Math.min(active, images.length - 1)]}
          alt={name}
          className="h-full w-full object-cover"
        />
      </div>
      {images.length > 1 && (
        <div className="mt-3 grid grid-cols-5 gap-2">
          {images.map((src, i) => (
            <button
              key={src + i}
              type="button"
              onClick={() => setActive(i)}
              className={`overflow-hidden rounded-lg bg-zinc-100 ring-2 transition ${
                i === active ? "ring-orange-500" : "ring-transparent hover:ring-zinc-300"
              }`}
              aria-label={`View image ${i + 1}`}
            >
              <img src={src} alt="" aria-hidden="true" className="aspect-square w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
