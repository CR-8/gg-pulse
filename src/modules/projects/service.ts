import { connectDB } from "@/lib/db";
import { ServiceError } from "@/lib/errors";
import { oid, toObjectId } from "@/lib/ids";
import { Project } from "@/models/Project";
import { ProjectMembership } from "@/models/ProjectMembership";
import { WorkspaceMember } from "@/models/WorkspaceMember";
import { logActivity } from "@/modules/activities/log";
import { recordAudit } from "@/modules/audit/record";
import { loadProject } from "@/modules/projects/access";
import { createProjectSchema, projectRoleSchema, updateProjectSchema } from "@/modules/projects/schemas";
import { assertCan, type WorkspaceScope } from "@/modules/workspaces/access";

// Not a "use server" module: every function takes an authorized WorkspaceScope.

export async function createProject(scope: WorkspaceScope, input: unknown): Promise<{ id: string }> {
  assertCan(scope, "project.create");
  const { name, description } = createProjectSchema.parse(input);
  await connectDB();
  const project = await Project.create({
    workspaceId: oid(scope.workspace.id),
    name,
    description: description || null,
    createdBy: oid(scope.actor.id),
  });
  const id = String(project._id);
  // The creator manages the project they started.
  await ProjectMembership.create({
    workspaceId: oid(scope.workspace.id),
    projectId: project._id,
    userId: oid(scope.actor.id),
    role: "PROJECT_MANAGER",
    createdBy: oid(scope.actor.id),
  });
  await logActivity({
    workspaceId: scope.workspace.id,
    projectId: id,
    actorId: scope.actor.id,
    action: "PROJECT_CREATED",
  });
  return { id };
}

export async function updateProject(scope: WorkspaceScope, projectId: string, input: unknown): Promise<void> {
  const { project, projectRole } = await loadProject(scope, projectId);
  assertCan(scope, "project.manage", projectRole);
  const patch = updateProjectSchema.parse(input);
  const set: Record<string, unknown> = {};
  if (patch.name !== undefined) set.name = patch.name;
  if (patch.description !== undefined) set.description = patch.description || null;
  if (patch.statusColor !== undefined) {
    set.statusColor = patch.statusColor;
    set.statusNote = patch.statusNote || null;
    set.statusUpdatedAt = new Date();
  }
  if (!Object.keys(set).length) return;
  await Project.updateOne({ _id: oid(project.id), workspaceId: oid(scope.workspace.id) }, { $set: set });
  await logActivity({
    workspaceId: scope.workspace.id,
    projectId: project.id,
    actorId: scope.actor.id,
    action: "PROJECT_UPDATED",
    metadata: { fields: Object.keys(set) },
  });
}

export async function archiveProject(scope: WorkspaceScope, projectId: string): Promise<void> {
  const { project, projectRole } = await loadProject(scope, projectId);
  assertCan(scope, "project.manage", projectRole);
  await Project.updateOne(
    { _id: oid(project.id), workspaceId: oid(scope.workspace.id) },
    { $set: { archivedAt: new Date() } },
  );
  await recordAudit({
    workspaceId: scope.workspace.id,
    actorId: scope.actor.id,
    action: "project.archived",
    targetType: "project",
    targetId: project.id,
    metadata: { name: project.name },
  });
}

/** Grants or clears a project role. The user must be an active member of the same workspace. */
export async function setProjectRole(scope: WorkspaceScope, projectId: string, input: unknown): Promise<void> {
  const { project, projectRole } = await loadProject(scope, projectId);
  assertCan(scope, "project.manage", projectRole);
  const { userId, role } = projectRoleSchema.parse(input);
  const uid = toObjectId(userId);
  const member = uid
    ? await WorkspaceMember.exists({ workspaceId: oid(scope.workspace.id), userId: uid, status: "ACTIVE" })
    : null;
  if (!uid || !member) throw new ServiceError("INVALID", "That person is not a member of this workspace.");
  if (userId === scope.actor.id && role !== "PROJECT_MANAGER") {
    throw new ServiceError("INVALID", "Ask another manager or an admin to change your own project role.");
  }

  const key = { projectId: oid(project.id), userId: uid };
  if (role) {
    await ProjectMembership.updateOne(
      key,
      { $set: { role }, $setOnInsert: { workspaceId: oid(scope.workspace.id), createdBy: oid(scope.actor.id) } },
      { upsert: true },
    );
  } else {
    await ProjectMembership.deleteOne(key);
  }
  await recordAudit({
    workspaceId: scope.workspace.id,
    actorId: scope.actor.id,
    action: "project.role_changed",
    targetType: "member",
    targetId: userId,
    metadata: { projectId: project.id, role },
  });
}
