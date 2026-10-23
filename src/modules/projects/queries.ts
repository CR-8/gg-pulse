import { connectDB } from "@/lib/db";
import { oid } from "@/lib/ids";
import { Project } from "@/models/Project";
import { ProjectMembership } from "@/models/ProjectMembership";
import { Task } from "@/models/Task";
import { loadProject } from "@/modules/projects/access";
import type { ProjectStatusColor } from "@/modules/projects/constants";
import { allows, type WorkspaceScope } from "@/modules/workspaces/access";
import type { ProjectRole } from "@/modules/workspaces/roles";

export type TaskCounts = { total: number; done: number; blocked: number; overdue: number };

export type ProjectSummaryDTO = {
  id: string;
  name: string;
  description: string | null;
  statusColor: ProjectStatusColor | null;
  counts: TaskCounts;
  updatedAt: string;
};

export async function listProjects(scope: WorkspaceScope): Promise<ProjectSummaryDTO[]> {
  await connectDB();
  const workspaceId = oid(scope.workspace.id);
  const projects = await Project.find({ workspaceId, archivedAt: null }).sort({ updatedAt: -1 }).lean();
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const rows = await Task.aggregate<{ _id: unknown } & TaskCounts>([
    { $match: { workspaceId, isArchived: false, projectId: { $in: projects.map((p) => p._id) } } },
    {
      $group: {
        _id: "$projectId",
        total: { $sum: 1 },
        done: { $sum: { $cond: [{ $eq: ["$status", "DONE"] }, 1, 0] } },
        blocked: { $sum: { $cond: [{ $eq: ["$status", "BLOCKED"] }, 1, 0] } },
        overdue: {
          $sum: {
            $cond: [
              { $and: [{ $ne: ["$status", "DONE"] }, { $ne: ["$dueDate", null] }, { $lt: ["$dueDate", today] }] },
              1,
              0,
            ],
          },
        },
      },
    },
  ]);
  const countsOf = new Map(rows.map((r) => [String(r._id), r]));
  return projects.map((p) => {
    const c = countsOf.get(String(p._id));
    return {
      id: String(p._id),
      name: p.name,
      description: p.description ?? null,
      statusColor: (p.statusColor as ProjectStatusColor | null) ?? null,
      counts: { total: c?.total ?? 0, done: c?.done ?? 0, blocked: c?.blocked ?? 0, overdue: c?.overdue ?? 0 },
      updatedAt: p.updatedAt.toISOString(),
    };
  });
}

export type ProjectDetailDTO = {
  id: string;
  name: string;
  description: string | null;
  statusColor: ProjectStatusColor | null;
  statusNote: string | null;
  projectRole: ProjectRole | null;
  team: { userId: string; role: ProjectRole }[];
  can: { manage: boolean; editTasks: boolean; comment: boolean };
};

/** Resolves the project through the ownership chain; throws NOT_FOUND across workspaces. */
export async function getProjectDetail(scope: WorkspaceScope, projectId: string): Promise<ProjectDetailDTO> {
  const { project, projectRole } = await loadProject(scope, projectId);
  const [doc, team] = await Promise.all([
    Project.findOne({ _id: oid(project.id), workspaceId: oid(scope.workspace.id) }).lean(),
    ProjectMembership.find({ workspaceId: oid(scope.workspace.id), projectId: oid(project.id) }).lean(),
  ]);
  return {
    id: project.id,
    name: project.name,
    description: doc?.description ?? null,
    statusColor: (doc?.statusColor as ProjectStatusColor | null) ?? null,
    statusNote: doc?.statusNote ?? null,
    projectRole,
    team: team.map((m) => ({ userId: String(m.userId), role: m.role as ProjectRole })),
    can: {
      manage: allows(scope, "project.manage", projectRole),
      editTasks: allows(scope, "task.update", projectRole),
      comment: allows(scope, "comment.create", projectRole),
    },
  };
}
