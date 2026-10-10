import { db } from "./db";
import { audit } from "./audit";

export const REWARD_STATUSES = ["AVAILABLE", "PENDING", "CLAIMED", "EXPIRED", "REJECTED", "REVERSED"] as const;

export async function getActiveSignupCampaign() {
  return db.rewardCampaign.findFirst({
    where: { type: "SIGNUP", status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
  });
}

/** Ensure the user has a reward ledger row for the active signup campaign. */
export async function ensureRewardForUser(userId: string) {
  const campaign = await getActiveSignupCampaign();
  if (!campaign) return null;
  const existing = await db.reward.findUnique({
    where: { userId_campaignId: { userId, campaignId: campaign.id } },
    include: { campaign: true },
  });
  if (existing) return existing;
  const reward = await db.reward.create({
    data: { userId, campaignId: campaign.id, status: "AVAILABLE", amountCents: campaign.amountCents },
    include: { campaign: true },
  });
  await db.rewardEvent.create({
    data: { rewardId: reward.id, fromStatus: "—", toStatus: "AVAILABLE", note: "Campaign enrollment" },
  });
  return reward;
}

export async function getUserReward(userId: string) {
  const campaign = await getActiveSignupCampaign();
  if (!campaign) return null;
  return db.reward.findUnique({
    where: { userId_campaignId: { userId, campaignId: campaign.id } },
    include: { campaign: true, events: { orderBy: { createdAt: "desc" } } },
  });
}

export type ClaimForm = {
  fullName: string;
  email: string;
  country: string;
  phone?: string;
};

/**
 * Claim the signup reward. Transactional + unique(userId, campaignId) means
 * duplicate claims are impossible, even under race conditions.
 */
export async function claimReward(userId: string, form: ClaimForm) {
  if (!form.fullName.trim()) throw new Error("Full name is required.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) throw new Error("Valid email is required.");
  if (!form.country.trim()) throw new Error("Country is required.");

  const campaign = await getActiveSignupCampaign();
  if (!campaign) throw new Error("No active reward campaign.");

  return db.$transaction(async (tx) => {
    let reward = await tx.reward.findUnique({
      where: { userId_campaignId: { userId, campaignId: campaign.id } },
    });
    if (!reward) {
      reward = await tx.reward.create({
        data: { userId, campaignId: campaign.id, status: "AVAILABLE", amountCents: campaign.amountCents },
      });
      await tx.rewardEvent.create({
        data: { rewardId: reward.id, fromStatus: "—", toStatus: "AVAILABLE", note: "Campaign enrollment" },
      });
    }
    if (reward.status === "CLAIMED") throw new Error("This reward has already been claimed.");
    if (reward.status !== "AVAILABLE") throw new Error(`Reward cannot be claimed in status ${reward.status}.`);

    const updated = await tx.reward.update({
      where: { id: reward.id },
      data: {
        status: "CLAIMED",
        claimedAt: new Date(),
        claimJson: { fullName: form.fullName.trim(), email: form.email.trim().toLowerCase(), country: form.country.trim(), phone: form.phone?.trim() || null },
      },
      include: { campaign: true },
    });
    await tx.rewardEvent.create({
      data: { rewardId: reward.id, fromStatus: "AVAILABLE", toStatus: "CLAIMED", note: "Claimed via reward claim form" },
    });
    return updated;
  }).then(async (reward) => {
    await audit("reward.claim", { actorId: userId, entity: "Reward", entityId: reward.id, meta: { campaignId: campaign.id } });
    return reward;
  });
}

export async function getRewardHistory(userId: string) {
  return db.reward.findMany({
    where: { userId },
    include: { campaign: true, events: { orderBy: { createdAt: "desc" } } },
    orderBy: { createdAt: "desc" },
  });
}

/** Admin: change a reward's status with an audit trail. */
export async function setRewardStatus(rewardId: string, to: string, actorId: string, note?: string) {
  if (!(REWARD_STATUSES as readonly string[]).includes(to)) throw new Error("Invalid reward status.");
  const reward = await db.reward.findUniqueOrThrow({ where: { id: rewardId } });
  const updated = await db.reward.update({ where: { id: rewardId }, data: { status: to } });
  await db.rewardEvent.create({ data: { rewardId, fromStatus: reward.status, toStatus: to, note: note ?? "Admin update" } });
  await audit("reward.status", { actorId, entity: "Reward", entityId: rewardId, meta: { from: reward.status, to } });
  return updated;
}
