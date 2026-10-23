import { connectDB } from "@/lib/db";
import { oid } from "@/lib/ids";
import { errorMessage, logger } from "@/lib/logger";
import { ActivityLog } from "@/models/ActivityLog";

type ActivityInput = {
  workspaceId: string;
  projectId?: string;
  taskId?: string;
  actorId: string;
  action: string;
  metadata?: Record<string, unknown>;
};

/** Appends to the shared GG-ops timeline. Best-effort: never fails the originating write. */
export async function logActivity(entry: ActivityInput): Promise<void> {
  try {
    await connectDB();
    await ActivityLog.create({
      workspaceId: oid(entry.workspaceId),
      projectId: entry.projectId ? oid(entry.projectId) : null,
      taskId: entry.taskId ? oid(entry.taskId) : null,
      actorId: oid(entry.actorId),
      entityType: entry.taskId ? "TASK" : entry.projectId ? "PROJECT" : "WORKSPACE",
      entityId: oid(entry.taskId ?? entry.projectId ?? entry.workspaceId),
      action: entry.action,
      metadata: entry.metadata ?? {},
    });
  } catch (error) {
    logger.error("Activity write failed", { action: entry.action, error: errorMessage(error) });
  }
}
