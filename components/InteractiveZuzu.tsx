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
  greet = false,
  className = "",
}: {
  size?: "sm" | "md" | "lg";
  showName?: boolean;
  greet?: boolean;
  className?: string;
}) {
  const [reaction, setReaction] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [hearts, setHearts] = useState<Heart[]>([]);
  const [taps, setTaps] = useState(0);
  const [winking, setWinking] = useState(false);
  const winkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [popping, setPopping] = useState(false);
  const [points, setPoints] = useState<number | null>(null);
  const [earned, setEarned] = useState<number | null>(null);
  const [sleeping, setSleeping] = useState(false);
  const [swaying, setSwaying] = useState(true);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
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
    // Preload wink + sleeping images so there's no flicker
    const winkImg = new Image();
    winkImg.src = "/zuvo-mascot-wink.jpg";
    const sleepImg = new Image();
    sleepImg.src = "/zuvo-mascot-sleeping.jpg";
    resetSleepTimer();
    scheduleAutoMove();
    if (greet) {
      const t = setTimeout(() => showMessage("Hi! I am Zuzu! 👋", 4000), 1200);
      return () => {
        clearTimeout(t);
        if (sleepTimer.current) clearTimeout(sleepTimer.current);
        if (autoTimer.current) clearTimeout(autoTimer.current);
        if (msgTimer.current) clearTimeout(msgTimer.current);
      };
    }
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
      .then(async (r) => ({ status: r.status, data: await r.json() }))
      .then(({ status, data: d }) => {
        if (d.ok) {
          setPoints(d.balance);
          setEarned(d.earned);
          setTimeout(() => setEarned(null), 1500);
        } else if (d.dailyCap) {
          showMessage("Daily limit reached! 🎉", 2000);
        } else if (status === 401) {
          // Guest tapped — show professional login prompt
          setShowLoginPrompt(true);
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
    setTaps((t) => {
      const next = t + 1;
      // Wink every 5th tap (not every tap — keeps it special!)
      if (next % 5 === 0 && !sleepingRef.current) {
        setWinking(true);
        if (winkTimer.current) clearTimeout(winkTimer.current);
        winkTimer.current = setTimeout(() => setWinking(false), 900);
      }
      return next;
    });
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

      {/* Zzz when sleeping — big and dreamy */}
      {sleeping && (
        <div aria-hidden="true" className="pointer-events-none absolute -top-6 right-0 z-10">
          <span className="zuzu-zzz absolute text-4xl">💤</span>
          <span className="zuzu-zzz absolute text-3xl [animation-delay:0.9s]">💤</span>
          <span className="zuzu-zzz absolute text-2xl [animation-delay:1.8s]">💤</span>
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
          src={sleeping ? "/zuvo-mascot-sleeping.jpg" : winking ? "/zuvo-mascot-wink.jpg" : "/zuvo-mascot.jpg"}
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
        <div className="mt-2 flex flex-col items-center gap-1.5">
          <p className="rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-4 py-1.5 text-sm font-extrabold text-white shadow-lg shadow-orange-500/30">
            ⭐ {points.toLocaleString()} ZUZU
          </p>
          <p className="text-center text-[11px] font-medium text-zinc-500">
            👆 Tap to earn • <span className="font-bold text-amber-600">1,000 = $1 off</span>
          </p>
        </div>
      )}
      {points === null && (
        <p className="mt-2 text-center text-[11px] font-medium text-zinc-500">
          👆 Tap Zuzu to earn coins • <span className="font-bold text-amber-600">1,000 = $1 off</span>
        </p>
      )}

      {/* Professional login prompt for guests */}
      {showLoginPrompt && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => setShowLoginPrompt(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Create an account to earn ZUZU coins"
        >
          <div
            className="w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-5 text-center">
              <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-white/20 text-3xl">
                ⭐
              </div>
              <h3 className="text-lg font-extrabold text-white">Earn ZUZU Coins!</h3>
              <p className="mt-1 text-sm text-white/90">Tap Zuzu, collect coins, get discounts</p>
            </div>
            <div className="px-6 py-5">
              <p className="text-center text-sm text-zinc-600">
                Please create a <span className="font-bold text-zinc-900">free account</span> first to
                start earning <span className="font-bold text-amber-600">1,000 = $1 off</span> 🎉
              </p>
              <div className="mt-5 flex flex-col gap-2.5">
                <a
                  href="/auth/signup"
                  className="rounded-xl bg-zinc-900 py-3 text-center text-sm font-bold text-white transition hover:bg-zinc-700 active:scale-[0.98]"
                >
                  Create Free Account
                </a>
                <a
                  href="/auth/login"
                  className="rounded-xl border-2 border-zinc-200 py-3 text-center text-sm font-bold text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50 active:scale-[0.98]"
                >
                  I Already Have an Account
                </a>
                <button
                  type="button"
                  onClick={() => setShowLoginPrompt(false)}
                  className="py-1 text-xs font-medium text-zinc-400 hover:text-zinc-600"
                >
                  Maybe later
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
