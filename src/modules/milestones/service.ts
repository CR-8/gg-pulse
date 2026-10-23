import { connectDB } from "@/lib/db";
import { ServiceError, notFoundError } from "@/lib/errors";
import { oid, toObjectId } from "@/lib/ids";
import { Milestone } from "@/models/Milestone";
import { logActivity } from "@/modules/activities/log";
import { createMilestoneSchema, updateMilestoneSchema } from "@/modules/milestones/schemas";
import { loadProject } from "@/modules/projects/access";
import { assertCan, type WorkspaceScope } from "@/modules/workspaces/access";

// Not a "use server" module: every function takes an authorized WorkspaceScope.

export async function createMilestone(scope: WorkspaceScope, projectId: string, input: unknown) {
  const { project, projectRole } = await loadProject(scope, projectId);
  assertCan(scope, "milestone.manage", projectRole);
  const data = createMilestoneSchema.parse(input);
  await connectDB();
  const milestone = await Milestone.create({
    workspaceId: oid(scope.workspace.id),
    projectId: oid(project.id),
    name: data.name,
    description: data.description || null,
    startDate: data.startDate,
    dueDate: data.dueDate,
    createdBy: oid(scope.actor.id),
  });
  await logActivity({
    workspaceId: scope.workspace.id,
    projectId: project.id,
    actorId: scope.actor.id,
    action: "MILESTONE_CREATED",
    metadata: { milestoneId: String(milestone._id), name: data.name },
  });
  return { id: String(milestone._id) };
}

export async function updateMilestone(scope: WorkspaceScope, milestoneId: string, input: unknown) {
  const id = toObjectId(milestoneId);
  if (!id) throw notFoundError("Milestone");
  await connectDB();
  const milestone = await Milestone.findOne({
    _id: id,
    workspaceId: oid(scope.workspace.id),
  }).lean();
  if (!milestone) throw notFoundError("Milestone");
  const { project, projectRole } = await loadProject(scope, String(milestone.projectId));
  assertCan(scope, "milestone.manage", projectRole);

  const patch = updateMilestoneSchema.parse(input);
  const startDate = patch.startDate === undefined ? milestone.startDate : patch.startDate;
  const dueDate = patch.dueDate === undefined ? milestone.dueDate : patch.dueDate;
  if (startDate && dueDate && startDate > dueDate) {
    throw new ServiceError("INVALID", "The start date must be on or before the due date.");
  }
  const set = Object.fromEntries(
    Object.entries({
      ...patch,
      description: patch.description === undefined ? undefined : patch.description || null,
    }).filter(([, v]) => v !== undefined),
  );
  if (!Object.keys(set).length) return;
  await Milestone.updateOne({ _id: id }, { $set: set });
  await logActivity({
    workspaceId: scope.workspace.id,
    projectId: project.id,
    actorId: scope.actor.id,
    action: "MILESTONE_UPDATED",
    metadata: {
      milestoneId,
      fields: Object.keys(set),
      ...(patch.status && patch.status !== milestone.status
        ? { status: { from: milestone.status, to: patch.status } }
        : {}),
    },
  });
}
