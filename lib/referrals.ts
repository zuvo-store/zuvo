import { db } from "./db";
import { audit } from "./audit";

/** Default demo referral code shipped with the seed data. Prefilled but editable at signup. */
export const DEMO_REFERRAL_CODE = "SUMMER2K26";

export const REFERRAL_STATUSES = ["PENDING", "ELIGIBLE", "REJECTED"] as const;

export function normalizeReferralCode(code: string): string {
  return code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export async function findReferrerByCode(code: string) {
  const normalized = normalizeReferralCode(code);
  if (!normalized) return null;
  return db.user.findUnique({ where: { referralCode: normalized } });
}

/** Record a landing visit for a referral link (?ref=CODE). Fire-and-forget. */
export async function recordReferralVisit(code: string) {
  const normalized = normalizeReferralCode(code);
  if (!normalized) return;
  const referrer = await db.user.findUnique({ where: { referralCode: normalized } });
  if (!referrer) return;
  await db.referralVisit.create({ data: { code: normalized } }).catch(() => {});
}

/**
 * Attribute a new signup to a referrer. Transactional; rejects self-referrals
 * and duplicate attributions (referredId is unique).
 */
export async function attributeReferral(newUserId: string, rawCode: string | null | undefined) {
  const code = normalizeReferralCode(rawCode ?? "");
  if (!code) return { ok: true, skipped: true as const };
  const referrer = await db.user.findUnique({ where: { referralCode: code } });
  if (!referrer) return { ok: false as const, error: "Referral code not found." };
  if (referrer.id === newUserId) return { ok: false as const, error: "You cannot refer yourself." };
  try {
    await db.referralAttribution.create({
      data: { referrerId: referrer.id, referredId: newUserId, code, status: "PENDING" },
    });
  } catch {
    return { ok: false as const, error: "This account already has a referral attribution." };
  }
  await audit("referral.attributed", {
    actorId: newUserId,
    entity: "ReferralAttribution",
    entityId: newUserId,
    meta: { code, referrerId: referrer.id },
  });
  return { ok: true as const, referrerId: referrer.id };
}

export type ReferralDashboard = {
  code: string;
  linkPath: string;
  visits: number;
  signups: number;
  pending: number;
  eligible: number;
  attributions: { id: string; referredName: string; status: string; createdAt: Date }[];
};

export async function getReferralDashboard(userId: string): Promise<ReferralDashboard> {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  const [visits, attributions] = await Promise.all([
    db.referralVisit.count({ where: { code: user.referralCode } }),
    db.referralAttribution.findMany({
      where: { referrerId: userId },
      include: { referred: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  return {
    code: user.referralCode,
    linkPath: `/auth/signup?ref=${user.referralCode}`,
    visits,
    signups: attributions.length,
    pending: attributions.filter((a) => a.status === "PENDING").length,
    eligible: attributions.filter((a) => a.status === "ELIGIBLE").length,
    attributions: attributions.map((a) => ({
      id: a.id,
      referredName: a.referred.name,
      status: a.status,
      createdAt: a.createdAt,
    })),
  };
}

/** Admin: change attribution status with audit trail. */
export async function setAttributionStatus(id: string, to: string, actorId: string) {
  if (!(REFERRAL_STATUSES as readonly string[]).includes(to)) throw new Error("Invalid status.");
  const attr = await db.referralAttribution.findUniqueOrThrow({ where: { id } });
  const updated = await db.referralAttribution.update({ where: { id }, data: { status: to } });
  await audit("referral.status", { actorId, entity: "ReferralAttribution", entityId: id, meta: { from: attr.status, to } });
  return updated;
}
