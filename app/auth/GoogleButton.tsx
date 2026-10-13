import Link from "next/link";

/** Official-ish Google "G" mark drawn inline (no external assets). */
function GoogleG() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.9-.1-1.5-.3-2.3H12v4.3h6.5c-.1 1.1-.8 2.7-2.4 3.8l-.1.3 3.5 2.7.2.1c2.2-2 3.8-5 3.8-8.9z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.8-2.9c-1 .7-2.4 1.2-4.1 1.2-3.2 0-5.9-2.1-6.8-5l-.3.1-3.7 2.9v.2C3.3 21.3 7.3 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.2 14.4c-.2-.7-.4-1.5-.4-2.4s.1-1.7.4-2.4l-.1-.3L1.4 6.6l-.1.1C.5 8.3 0 10.1 0 12s.5 3.7 1.3 5.4l3.9-3z"
      />
      <path
        fill="#EA4335"
        d="M12 4.7c1.8 0 3 .8 3.7 1.4l3.3-3.2C17 1.1 14.8 0 12 0 7.3 0 3.3 2.7 1.3 6.6l3.9 3c.9-2.8 3.6-4.9 6.8-4.9z"
      />
    </svg>
  );
}

export default function GoogleButton({
  next,
  label = "Continue with Google",
}: {
  next?: string;
  label?: string;
}) {
  const href =
    "/api/auth/google" + (next && next !== "/" ? `?next=${encodeURIComponent(next)}` : "");
  return (
    <Link
      href={href}
      className="inline-flex w-full items-center justify-center gap-2.5 rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50"
    >
      <GoogleG />
      {label}
    </Link>
  );
}

/** Friendly messages for ?error= codes coming back from the OAuth callback. */
export function googleErrorMessage(code: string | undefined): string | null {
  switch (code) {
    case "google_not_configured":
      return "Google sign-in isn't set up yet. Please sign in with email instead.";
    case "google_denied":
      return "Google sign-in was cancelled. Please try again.";
    case "google_unverified":
      return "Your Google email isn't verified. Please verify it with Google and try again.";
    case "google_failed":
      return "Google sign-in failed. Please try again.";
    default:
      return null;
  }
}
