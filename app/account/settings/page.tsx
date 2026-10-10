export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { requireUser, destroySession } from "@/lib/auth";
import { PasswordForm, DeleteAccountForm } from "./SettingsForms";

async function signOut() {
  "use server";
  await destroySession();
  redirect("/");
}

export default async function SettingsPage() {
  const user = await requireUser();

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <h1 className="text-2xl font-bold text-zinc-900">Settings</h1>

      <PasswordForm />

      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="mb-2 text-lg font-semibold text-zinc-900">Sessions</h2>
        <p className="mb-4 text-sm text-zinc-600">
          Sign out of ZUVO on this device.
        </p>
        <form action={signOut}>
          <button
            type="submit"
            className="rounded-xl border border-zinc-300 px-4 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
          >
            Sign out
          </button>
        </form>
      </div>

      <DeleteAccountForm email={user.email} />
    </main>
  );
}
