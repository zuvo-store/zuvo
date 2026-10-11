"use client";

import { useEffect, useState } from "react";

const COLORS = ["#f97316", "#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#a855f7", "#ec4899"];
const SHAPES = ["rounded-sm", "rounded-full", "rounded-[2px]"];

type Piece = {
  id: number;
  left: number;
  size: number;
  color: string;
  shape: string;
  duration: number;
  delay: number;
};

/** Celebration confetti burst — pure CSS, no dependencies. */
export default function Confetti({ count = 60 }: { count?: number }) {
  const [pieces, setPieces] = useState<Piece[]>([]);

  useEffect(() => {
    const arr: Piece[] = Array.from({ length: count }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      size: 6 + Math.random() * 8,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
      duration: 2.5 + Math.random() * 2,
      delay: Math.random() * 0.8,
    }));
    setPieces(arr);
    const t = setTimeout(() => setPieces([]), 6000);
    return () => clearTimeout(t);
  }, [count]);

  return (
    <div aria-hidden="true">
      {pieces.map((p) => (
        <span
          key={p.id}
          className={`confetti-piece ${p.shape}`}
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size * (p.shape === "rounded-full" ? 1 : 1.6),
            backgroundColor: p.color,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
