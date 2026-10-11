"use client";

import { useCallback, useRef, useState } from "react";

const REACTIONS = ["zuzu-bounce", "zuzu-spin", "zuzu-wiggle", "zuzu-squish"] as const;

const MESSAGES = [
  "Hey! I'm Zuzu! 👋",
  "Great deals today! 🛍️",
  "Tap me again! 😄",
  "Shopping is fun! 🎉",
  "Did you claim your $20? 🎁",
  "You're awesome! ⭐",
  "Let's find deals! 🔥",
  "Boing! 🧡",
];

type Heart = { id: number; left: number; delay: number };

/**
 * Interactive Zuzu — ZUVO's mascot. Tap to get a random playful reaction
 * with a speech bubble. Idle: gentle float + occasional blink.
 */
export default function InteractiveZuzu({
  size = "md",
  showName = true,
  className = "",
}: {
  size?: "sm" | "md" | "lg";
  showName?: boolean;
  className?: string;
}) {
  const [reaction, setReaction] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [hearts, setHearts] = useState<Heart[]>([]);
  const [taps, setTaps] = useState(0);
  const msgTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartId = useRef(0);

  const sizes = {
    sm: "h-20 w-20",
    md: "h-32 w-32",
    lg: "h-44 w-44",
  };

  const tap = useCallback(() => {
    // Random reaction (avoid repeating the same one twice)
    setReaction((prev) => {
      const pool = REACTIONS.filter((r) => r !== prev);
      return pool[Math.floor(Math.random() * pool.length)];
    });
    // Fun message
    const msg = MESSAGES[Math.floor(Math.random() * MESSAGES.length)];
    setMessage(msg);
    if (msgTimer.current) clearTimeout(msgTimer.current);
    msgTimer.current = setTimeout(() => setMessage(null), 2500);
    // Floating hearts
    const newHearts: Heart[] = Array.from({ length: 3 }, () => ({
      id: heartId.current++,
      left: 20 + Math.random() * 60,
      delay: Math.random() * 0.3,
    }));
    setHearts((h) => [...h, ...newHearts]);
    setTimeout(() => {
      setHearts((h) => h.filter((x) => !newHearts.some((n) => n.id === x.id)));
    }, 1500);
    setTaps((t) => t + 1);
  }, []);

  return (
    <div className={`relative inline-flex flex-col items-center ${className}`}>
      {/* Speech bubble */}
      {message && (
        <div className="zuzu-bubble absolute -top-2 z-10 -translate-y-full whitespace-nowrap rounded-2xl rounded-bl-sm bg-white px-4 py-2 text-sm font-bold text-zinc-800 shadow-xl ring-1 ring-zinc-100">
          {message}
          <span aria-hidden="true" className="absolute -bottom-1.5 left-6 h-3 w-3 rotate-45 bg-white ring-1 ring-zinc-100" />
        </div>
      )}

      {/* Floating hearts */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-visible">
        {hearts.map((h) => (
          <span
            key={h.id}
            className="zuzu-heart absolute bottom-1/2 text-lg"
            style={{ left: `${h.left}%`, animationDelay: `${h.delay}s` }}
          >
            🧡
          </span>
        ))}
      </div>

      {/* Zuzu */}
      <button
        type="button"
        onClick={tap}
        aria-label="Say hi to Zuzu"
        title="Tap Zuzu!"
        className="group relative cursor-pointer rounded-full outline-none focus-visible:ring-4 focus-visible:ring-orange-300"
      >
        <img
          src="/zuvo-mascot.jpg"
          alt="Zuzu, the ZUVO mascot"
          draggable={false}
          className={`${sizes[size]} rounded-full object-cover shadow-xl shadow-orange-500/25 ring-4 ring-white transition-transform group-active:scale-95 ${
            reaction ?? "zuzu-idle"
          }`}
          onAnimationEnd={() => setReaction(null)}
        />
        {/* tap hint ring */}
        <span aria-hidden="true" className="pointer-events-none absolute inset-0 animate-ping rounded-full bg-orange-400/20 [animation-duration:2.5s]" />
      </button>

      {showName && (
        <p className="mt-2 text-sm font-extrabold tracking-wide text-zinc-700">
          Zuzu
          <span className="ml-1.5 rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold uppercase text-orange-600">
            {taps === 0 ? "tap me!" : `${taps} tap${taps === 1 ? "" : "s"}`}
          </span>
        </p>
      )}
    </div>
  );
}
