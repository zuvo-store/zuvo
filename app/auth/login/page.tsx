export const dynamic = "force-dynamic";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import LoginForm from "./LoginForm";

export const metadata = { title: "Sign in — ZUVO" };

function safeNext(raw: string | undefined): string {
  if (raw && raw.startsWith("/") && !raw.startsWith("//")) return raw;
  return "/";
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const user = await getSessionUser();
  if (user) redirect("/");

  const sp = await searchParams;
  const nextPath = safeNext(sp.next);

  return (
    <div className="mx-auto w-full max-w-md px-4 py-10">
      <LoginForm nextPath={nextPath} />
    </div>
  );
}
