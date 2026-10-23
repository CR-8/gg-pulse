import type { Types } from "mongoose";
import { connectDB } from "@/lib/db";
import { ServiceError, notFoundError } from "@/lib/errors";
import { oid, toObjectId } from "@/lib/ids";
import { Comment } from "@/models/Comment";
import { Milestone } from "@/models/Milestone";
import { Task } from "@/models/Task";
import { WorkspaceMember } from "@/models/WorkspaceMember";
import { logActivity } from "@/modules/activities/log";
import { loadProject } from "@/modules/projects/access";
import { commentSchema, createTaskSchema, updateTaskSchema } from "@/modules/tasks/schemas";
import { assertCan, type WorkspaceScope } from "@/modules/workspaces/access";

// Not a "use server" module: every function takes an authorized WorkspaceScope.

const POSITION_STEP = 1024;

/** Ownership chain for references: assignees ∈ workspace (ACTIVE), milestone ∈ project. */
async function assertReferences(
  scope: WorkspaceScope,
  projectId: string,
  refs: { assigneeIds?: string[]; milestoneId?: string | null },
) {
  if (refs.assigneeIds?.length) {
    const unique = [...new Set(refs.assigneeIds)];
    const found = await WorkspaceMember.countDocuments({
      workspaceId: oid(scope.workspace.id),
      userId: { $in: unique.map(oid) },
      status: "ACTIVE",
    });
    if (found !== unique.length) {
      throw new ServiceError("INVALID", "Assignees must be members of this workspace.");
    }
  }
  if (refs.milestoneId) {
    const exists = await Milestone.exists({
      _id: oid(refs.milestoneId),
      workspaceId: oid(scope.workspace.id),
      projectId: oid(projectId),
    });
    if (!exists) throw new ServiceError("INVALID", "That milestone belongs to a different project.");
  }
}

export async function createTask(scope: WorkspaceScope, projectId: string, input: unknown): Promise<{ id: string }> {
  const { project } = await loadProject(scope, projectId);
  assertCan(scope, "task.create");
  const data = createTaskSchema.parse(input);
  await assertReferences(scope, project.id, data);

  // Appended to the end of GG-ops's "No section" group.
  const last = await Task.findOne({ workspaceId: oid(scope.workspace.id), projectId: oid(project.id), sectionId: null })
    .sort({ position: -1 })
    .select("position")
    .lean();
  const task = await Task.create({
    workspaceId: oid(scope.workspace.id),
    projectId: oid(project.id),
    sectionId: null,
    title: data.title,
    description: data.description || null,
    status: data.status,
    priority: data.priority,
    assigneeIds: [...new Set(data.assigneeIds)].map(oid),
    dueDate: data.dueDate,
    estimateHours: data.estimateHours,
    milestoneId: data.milestoneId ? oid(data.milestoneId) : null,
    completedAt: data.status === "DONE" ? new Date() : null,
    createdBy: oid(scope.actor.id),
    position: (last?.position ?? 0) + POSITION_STEP,
  });
  const id = String(task._id);
  await logActivity({
    workspaceId: scope.workspace.id,
    projectId: project.id,
    taskId: id,
    actorId: scope.actor.id,
    action: "TASK_CREATED",
  });
  return { id };
}

async function loadTask(scope: WorkspaceScope, taskId: string) {
  const id = toObjectId(taskId);
  if (!id) throw notFoundError("Task");
  await connectDB();
  const task = await Task.findOne({ _id: id, workspaceId: oid(scope.workspace.id), isArchived: false }).lean();
  if (!task) throw notFoundError("Task");
  // Re-checks the chain and that the project is not archived.
  const ctx = await loadProject(scope, String(task.projectId));
  return { task, ...ctx };
}

const idList = (ids: Types.ObjectId[] | undefined) => (ids ?? []).map(String).sort();

export async function updateTask(scope: WorkspaceScope, taskId: string, input: unknown): Promise<void> {
  const { task, project } = await loadTask(scope, taskId);
  assertCan(scope, "task.update");
  const patch = updateTaskSchema.parse(input);
  await assertReferences(scope, project.id, patch);

  const set: Record<string, unknown> = {};
  const changes: Record<string, { from: unknown; to: unknown }> = {};
  const change = (field: string, from: unknown, to: unknown, stored: unknown = to) => {
    if (JSON.stringify(from) === JSON.stringify(to)) return;
    set[field] = stored;
    changes[field] = { from, to };
  };

  if (patch.title !== undefined) change("title", task.title, patch.title);
  if (patch.description !== undefined) {
    change("description", task.description ?? null, patch.description || null);
  }
  if (patch.priority !== undefined) change("priority", task.priority, patch.priority);
  if (patch.status !== undefined) {
    change("status", task.status, patch.status);
    if (changes.status) set.completedAt = patch.status === "DONE" ? new Date() : null;
  }
  if (patch.assigneeIds !== undefined) {
    const next = [...new Set(patch.assigneeIds)].sort();
    change("assigneeIds", idList(task.assigneeIds), next, next.map(oid));
  }
  if (patch.dueDate !== undefined) {
    change("dueDate", task.dueDate?.toISOString() ?? null, patch.dueDate?.toISOString() ?? null, patch.dueDate);
  }
  if (patch.estimateHours !== undefined) change("estimateHours", task.estimateHours ?? null, patch.estimateHours);
  if (patch.milestoneId !== undefined) {
    const from = task.milestoneId ? String(task.milestoneId) : null;
    change("milestoneId", from, patch.milestoneId, patch.milestoneId ? oid(patch.milestoneId) : null);
  }
  if (!Object.keys(changes).length) return;

  set.updatedBy = oid(scope.actor.id);
  await Task.updateOne({ _id: task._id, workspaceId: oid(scope.workspace.id) }, { $set: set });
  // Field-level changes feed later cycle-time and blocked-time analysis.
  const { description, ...loggable } = changes;
  await logActivity({
    workspaceId: scope.workspace.id,
    projectId: project.id,
    taskId,
    actorId: scope.actor.id,
    action: changes.status?.to === "DONE" ? "TASK_COMPLETED" : "TASK_UPDATED",
    metadata: { changes: description ? { ...loggable, description: { from: "…", to: "…" } } : loggable },
  });
}

export async function addComment(scope: WorkspaceScope, taskId: string, input: unknown): Promise<{ id: string }> {
  const { task, project, projectRole } = await loadTask(scope, taskId);
  assertCan(scope, "comment.create", projectRole);
  const { body } = commentSchema.parse(input);
  const comment = await Comment.create({
    workspaceId: oid(scope.workspace.id),
    projectId: oid(project.id),
    taskId: task._id,
    authorId: oid(scope.actor.id),
    body,
  });
  await logActivity({
    workspaceId: scope.workspace.id,
    projectId: project.id,
    taskId,
    actorId: scope.actor.id,
    action: "COMMENT_ADDED",
    metadata: { commentId: String(comment._id) },
  });
  return { id: String(comment._id) };
}
