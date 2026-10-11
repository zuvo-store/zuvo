"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const REACTIONS = ["zuzu-bounce", "zuzu-spin", "zuzu-wiggle", "zuzu-squish"] as const;
const AUTO_MOVES = ["zuzu-wiggle", "zuzu-peek", "zuzu-bounce"] as const;

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

const WAKE_MESSAGES = [
  "Yawn… I'm awake! 😄",
  "Huh? Oh hey! 👋",
  "I was just resting! 😅",
  "Zuzu is back! 🎉",
];

const SLEEP_AFTER_MS = 25000; // fall asleep after 25s of no interaction
const AUTO_MOVE_MIN_MS = 9000;
const AUTO_MOVE_MAX_MS = 16000;

type Heart = { id: number; left: number; delay: number };

/**
 * Interactive Zuzu — ZUVO's mascot with a life of its own.
 * - Tap for playful reactions + speech bubbles + hearts
 * - Falls asleep after 25s idle (tap to wake!)
 * - Moves on its own every ~9-16s (wiggle, peek, bounce)
 * - Sways gently like holding shopping bags
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
  const [popping, setPopping] = useState(false);
  const [points, setPoints] = useState<number | null>(null);
  const [earned, setEarned] = useState<number | null>(null);
  const [sleeping, setSleeping] = useState(false);
  const [swaying, setSwaying] = useState(true);
  const msgTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sleepTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartId = useRef(0);
  const sleepingRef = useRef(false);
  const reactionRef = useRef<string | null>(null);

  const sizes = {
    sm: "h-20 w-20",
    md: "h-32 w-32",
    lg: "h-44 w-44",
  };

  function showMessage(msg: string, ms = 2500) {
    setMessage(msg);
    if (msgTimer.current) clearTimeout(msgTimer.current);
    msgTimer.current = setTimeout(() => setMessage(null), ms);
  }

  function resetSleepTimer() {
    if (sleepTimer.current) clearTimeout(sleepTimer.current);
    sleepTimer.current = setTimeout(() => {
      sleepingRef.current = true;
      setSleeping(true);
      setSwaying(false);
      setReaction(null);
    }, SLEEP_AFTER_MS);
  }

  function scheduleAutoMove() {
    if (autoTimer.current) clearTimeout(autoTimer.current);
    const wait = AUTO_MOVE_MIN_MS + Math.random() * (AUTO_MOVE_MAX_MS - AUTO_MOVE_MIN_MS);
    autoTimer.current = setTimeout(() => {
      // Only move autonomously when awake and not mid-reaction
      if (!sleepingRef.current && !reactionRef.current) {
        const move = AUTO_MOVES[Math.floor(Math.random() * AUTO_MOVES.length)];
        reactionRef.current = move;
        setReaction(move);
      }
      scheduleAutoMove();
    }, wait);
  }

  useEffect(() => {
    resetSleepTimer();
    scheduleAutoMove();
    return () => {
      if (sleepTimer.current) clearTimeout(sleepTimer.current);
      if (autoTimer.current) clearTimeout(autoTimer.current);
      if (msgTimer.current) clearTimeout(msgTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tap = useCallback(() => {
    // Wake up if sleeping
    if (sleepingRef.current) {
      sleepingRef.current = false;
      setSleeping(false);
      setSwaying(true);
      reactionRef.current = "zuzu-bounce";
      setReaction("zuzu-bounce");
      showMessage(WAKE_MESSAGES[Math.floor(Math.random() * WAKE_MESSAGES.length)]);
      resetSleepTimer();
      setTaps((t) => t + 1);
      return;
    }

    resetSleepTimer();
    // Zuzu pops OUT of the circle!
    setPopping(true);

    // Earn points (logged-in users)
    fetch("/api/zuzu/tap", { method: "POST" })
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) {
          setPoints(d.balance);
          setEarned(d.earned);
          setTimeout(() => setEarned(null), 1500);
        } else if (d.dailyCap) {
          showMessage("Daily limit reached! 🎉", 2000);
        }
      })
      .catch(() => {});

    setReaction((prev) => {
      const pool = REACTIONS.filter((r) => r !== prev);
      const next = pool[Math.floor(Math.random() * pool.length)];
      reactionRef.current = next;
      return next;
    });
    showMessage(MESSAGES[Math.floor(Math.random() * MESSAGES.length)]);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onAnimationEnd() {
    reactionRef.current = null;
    setReaction(null);
  }

  const imgCls = sleeping
    ? "zuzu-sleeping"
    : reaction ?? (swaying ? "zuzu-sway" : "zuzu-idle");

  return (
    <div className={`relative inline-flex flex-col items-center ${className}`}>
      {/* Speech bubble */}
      {message && (
        <div className="zuzu-bubble absolute -top-2 z-10 -translate-y-full whitespace-nowrap rounded-2xl rounded-bl-sm bg-white px-4 py-2 text-sm font-bold text-zinc-800 shadow-xl ring-1 ring-zinc-100">
          {message}
          <span aria-hidden="true" className="absolute -bottom-1.5 left-6 h-3 w-3 rotate-45 bg-white ring-1 ring-zinc-100" />
        </div>
      )}

      {/* Zzz when sleeping */}
      {sleeping && (
        <div aria-hidden="true" className="pointer-events-none absolute -top-4 right-2 z-10">
          <span className="zuzu-zzz absolute text-xl">💤</span>
          <span className="zuzu-zzz absolute text-lg [animation-delay:0.9s]">💤</span>
          <span className="zuzu-zzz absolute text-sm [animation-delay:1.8s]">💤</span>
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

      {/* Zuzu in a circle — pops OUT on tap! */}
      <button
        type="button"
        onClick={tap}
        aria-label={sleeping ? "Wake up Zuzu" : "Say hi to Zuzu"}
        title={sleeping ? "Wake Zuzu up!" : "Tap Zuzu!"}
        className="group relative cursor-pointer rounded-full outline-none focus-visible:ring-4 focus-visible:ring-orange-300"
      >
        <img
          src="/zuvo-mascot.jpg"
          alt="Zuzu, the ZUVO mascot"
          draggable={false}
          className={`${sizes[size]} rounded-full object-cover shadow-xl shadow-orange-500/25 ring-4 ring-white transition-transform group-active:scale-95 ${popping ? "zuzu-popout" : imgCls}`}
          onAnimationEnd={() => { if (popping) setPopping(false); else onAnimationEnd(); }}
        />
        {popping && (
          <span aria-hidden="true" className="zuzu-ring-burst pointer-events-none absolute inset-0 rounded-full ring-4 ring-orange-400" />
        )}
        {!sleeping && !popping && (
          <span aria-hidden="true" className="pointer-events-none absolute inset-0 animate-ping rounded-full bg-orange-400/20 [animation-duration:2.5s]" />
        )}
      </button>

      {/* Points earned popup */}
      {earned !== null && (
        <div className="zuzu-bubble pointer-events-none absolute -right-2 top-4 z-10 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-3 py-1 text-sm font-extrabold text-white shadow-lg">
          +{earned} pts!
        </div>
      )}

      {showName && (
        <p className="mt-2 text-sm font-extrabold tracking-wide text-zinc-700">
          Zuzu
          <span className="ml-1.5 rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold uppercase text-orange-600">
            {sleeping ? "💤 sleeping…" : taps === 0 ? "tap me!" : `${taps} tap${taps === 1 ? "" : "s"}`}
          </span>
        </p>
      )}
      {points !== null && (
        <p className="mt-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700 ring-1 ring-amber-200">
          ⭐ {points.toLocaleString()} ZUZU points
        </p>
      )}
    </div>
  );
}
