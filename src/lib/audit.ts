import { db } from "@/db";
import { auditLogs } from "@/db/schema";

export async function logAction({
  userId,
  action,
  entity,
  entityId,
  meta,
}: {
  userId?: number;
  action: string;
  entity?: string;
  entityId?: number;
  meta?: Record<string, unknown>;
}) {
  await db.insert(auditLogs).values({
    userId,
    action,
    entity,
    entityId,
    meta,
  });
}
