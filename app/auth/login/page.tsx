export const dynamic = "force-dynamic";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import LoginForm from "./LoginForm";
import GoogleButton, { googleErrorMessage } from "../GoogleButton";

export const metadata = { title: "Sign in — ZUVO" };

function safeNext(raw: string | undefined): string {
  if (raw && raw.startsWith("/") && !raw.startsWith("//")) return raw;
  return "/";
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const user = await getSessionUser();
  if (user) redirect("/");

  const sp = await searchParams;
  const nextPath = safeNext(sp.next);
  const oauthError = googleErrorMessage(sp.error);
  const googleEnabled = !!process.env.GOOGLE_CLIENT_ID;

  return (
    <div className="mx-auto w-full max-w-md px-4 py-10">
      {oauthError && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {oauthError}
        </div>
      )}
      {googleEnabled && (
        <div className="mb-4">
          <GoogleButton next={nextPath} label="Continue with Google" />
          <div className="my-4 flex items-center gap-3 text-xs text-zinc-400">
            <span className="h-px flex-1 bg-zinc-200" />
            or sign in with email
            <span className="h-px flex-1 bg-zinc-200" />
          </div>
        </div>
      )}
      <LoginForm nextPath={nextPath} />
    </div>
  );
}
