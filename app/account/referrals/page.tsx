export const dynamic = "force-dynamic";

import { requireUser } from "@/lib/auth";
import { getReferralDashboard } from "@/lib/referrals";
import { appUrl } from "@/lib/email";
import ReferralDashboardClient from "./ReferralDashboard";

export default async function ReferralsPage() {
  const user = await requireUser();
  const dashboard = await getReferralDashboard(user.id);
  const shareUrl = appUrl() + dashboard.linkPath;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-zinc-900">Referrals</h1>
      <ReferralDashboardClient dashboard={dashboard} shareUrl={shareUrl} />
    </main>
  );
}
