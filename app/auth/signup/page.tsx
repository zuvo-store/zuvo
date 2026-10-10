export const dynamic = "force-dynamic";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DEMO_REFERRAL_CODE } from "@/lib/referrals";
import SignupForm from "./SignupForm";

export const metadata = { title: "Create account — ZUVO" };

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const user = await getSessionUser();
  if (user) redirect("/");

  const sp = await searchParams;
  // Prefill the demo code when no ?ref= is present (editable and removable).
  const initialRef = sp.ref?.trim() || DEMO_REFERRAL_CODE;

  return (
    <div className="mx-auto w-full max-w-md px-4 py-10">
      <SignupForm initialRef={initialRef} />
    </div>
  );
}
