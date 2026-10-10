import { db } from "./db";
import type { Prisma } from "@prisma/client";

export async function audit(
  action: string,
  opts: { actorId?: string; entity: string; entityId?: string; meta?: Record<string, unknown> } = {
    entity: "System",
  }
) {
  try {
    await db.auditLog.create({
      data: {
        action,
        actorId: opts.actorId ?? null,
        entity: opts.entity,
        entityId: opts.entityId ?? null,
        metaJson: (opts.meta ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  } catch {
    // Audit logging must never break the request it observes.
  }
}
