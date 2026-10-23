import { connectDB } from "@/lib/db";
import { notFoundError } from "@/lib/errors";
import { oid, toObjectId } from "@/lib/ids";
import { Project } from "@/models/Project";
import { ProjectMembership } from "@/models/ProjectMembership";
import type { WorkspaceScope } from "@/modules/workspaces/access";
import type { ProjectRole } from "@/modules/workspaces/roles";

export type ProjectContext = {
  project: { id: string; name: string };
  projectRole: ProjectRole | null;
};

/** Ownership chain: the project must belong to the scope's workspace and not be archived. */
export async function loadProject(
  scope: WorkspaceScope,
  projectId: unknown,
): Promise<ProjectContext> {
  const id = toObjectId(projectId);
  if (!id) throw notFoundError("Project");
  await connectDB();
  const project = await Project.findOne({
    _id: id,
    workspaceId: oid(scope.workspace.id),
    archivedAt: null,
  })
    .select("name")
    .lean();
  if (!project) throw notFoundError("Project");
  const membership = await ProjectMembership.findOne({ projectId: id, userId: oid(scope.actor.id) })
    .select("role")
    .lean();
  return {
    project: { id: String(project._id), name: project.name },
    projectRole: (membership?.role as ProjectRole | undefined) ?? null,
  };
}
