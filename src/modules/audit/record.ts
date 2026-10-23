import { connectDB } from "@/lib/db";
import { oid } from "@/lib/ids";
import { errorMessage, logger } from "@/lib/logger";
import { AuditEvent } from "@/models/AuditEvent";

type AuditInput = {
  workspaceId: string | null;
  actorId: string;
  action: string;
  targetType: string;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
};

/**
 * Records a consequential action. Written after the change succeeds; a failed audit write is
 * logged loudly but does not undo the change (the change already happened).
 */
export async function recordAudit(entry: AuditInput): Promise<void> {
  try {
    await connectDB();
    await AuditEvent.create({
      workspaceId: entry.workspaceId ? oid(entry.workspaceId) : null,
      actorId: oid(entry.actorId),
      action: entry.action,
      targetType: entry.targetType,
      targetId: entry.targetId ?? null,
      metadata: entry.metadata ?? {},
    });
  } catch (error) {
    logger.error("Audit write failed", { action: entry.action, error: errorMessage(error) });
  }
}
