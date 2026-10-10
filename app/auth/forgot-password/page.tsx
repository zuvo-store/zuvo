export const dynamic = "force-dynamic";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import ForgotPasswordForm from "./ForgotPasswordForm";

export const metadata = { title: "Forgot password — ZUVO" };

export default async function ForgotPasswordPage() {
  const user = await getSessionUser();
  if (user) redirect("/");

  return (
    <div className="mx-auto w-full max-w-md px-4 py-10">
      <ForgotPasswordForm />
    </div>
  );
}
