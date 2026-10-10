export const dynamic = "force-dynamic";

import { requireUser } from "@/lib/auth";
import ProfileForm from "./ProfileForm";

export default async function ProfilePage() {
  const user = await requireUser();
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-zinc-900">Profile</h1>
      <ProfileForm initialName={user.name} email={user.email} emailVerified={!!user.emailVerified} />
    </main>
  );
}
