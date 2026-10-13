export const dynamic = "force-dynamic";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DEMO_REFERRAL_CODE } from "@/lib/referrals";
import SignupForm from "./SignupForm";
import GoogleButton, { googleErrorMessage } from "../GoogleButton";

export const metadata = { title: "Create account — ZUVO" };

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string; error?: string }>;
}) {
  const user = await getSessionUser();
  if (user) redirect("/");

  const sp = await searchParams;
  // Prefill the demo code when no ?ref= is present (editable and removable).
  const initialRef = sp.ref?.trim() || DEMO_REFERRAL_CODE;
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
          <GoogleButton label="Sign up with Google" />
          <div className="my-4 flex items-center gap-3 text-xs text-zinc-400">
            <span className="h-px flex-1 bg-zinc-200" />
            or sign up with email
            <span className="h-px flex-1 bg-zinc-200" />
          </div>
        </div>
      )}
      <SignupForm initialRef={initialRef} />
    </div>
  );
}
