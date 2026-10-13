import { db } from "@/lib/db";

export type FraudFlag = { signal: string; detail: string };
export type ScoredOrder = {
  id: string; orderNumber: string; totalCents: number; status: string;
  paymentStatus: string; createdAt: Date; customer: string; email: string;
  score: number; level: "HIGH" | "MEDIUM" | "LOW"; flags: FraudFlag[];
};

const DISPOSABLE = ["mailinator.com", "tempmail.com", "10minutemail.com", "guerrillamail.com", "yopmail.com"];

/** Score recent orders for fraud risk. Higher score = riskier. */
export async function scoreRecentOrders(limit = 50): Promise<ScoredOrder[]> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const orders = await db.order.findMany({
    where: { status: { notIn: ["DRAFT", "CANCELLED"] }, createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true, orderNumber: true, totalCents: true, status: true, paymentStatus: true,
      createdAt: true, guestName: true, guestEmail: true,
      user: { select: { id: true, name: true, email: true, createdAt: true } },
    },
  });

  const scored: ScoredOrder[] = [];
  for (const o of orders) {
    const flags: FraudFlag[] = [];
    let score = 0;
    const email = o.user?.email ?? o.guestEmail ?? "";
    const domain = email.split("@")[1]?.toLowerCase() ?? "";

    if (o.totalCents >= 20000) { score += 25; flags.push({ signal: "High value", detail: `Order total $${(o.totalCents / 100).toFixed(2)}` }); }
    else if (o.totalCents >= 10000) { score += 10; flags.push({ signal: "Above-average value", detail: `$${(o.totalCents / 100).toFixed(2)}` }); }

    if (!o.user) { score += 15; flags.push({ signal: "Guest checkout", detail: "No account linked" }); }
    else {
      const ageDays = (Date.now() - new Date(o.user.createdAt).getTime()) / 86400000;
      if (ageDays < 2) { score += 20; flags.push({ signal: "Brand-new account", detail: `Created ${ageDays < 1 ? "today" : "yesterday"}` }); }
    }

    if (DISPOSABLE.includes(domain)) { score += 30; flags.push({ signal: "Disposable email", detail: domain }); }

    if (o.user) {
      const recentCount = await db.order.count({
        where: { userId: o.user.id, status: { notIn: ["DRAFT", "CANCELLED"] }, createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      });
      if (recentCount >= 3) { score += 20; flags.push({ signal: "Rapid ordering", detail: `${recentCount} orders in 24h` }); }
    }

    if (o.paymentStatus === "FAILED") { score += 15; flags.push({ signal: "Failed payment", detail: "Payment failed at least once" }); }

    const level = score >= 40 ? "HIGH" : score >= 20 ? "MEDIUM" : "LOW";
    scored.push({
      id: o.id, orderNumber: o.orderNumber, totalCents: o.totalCents, status: o.status,
      paymentStatus: o.paymentStatus, createdAt: o.createdAt,
      customer: o.user?.name ?? o.guestName ?? "Guest", email,
      score, level, flags,
    });
  }
  return scored.sort((a, b) => b.score - a.score);
}
