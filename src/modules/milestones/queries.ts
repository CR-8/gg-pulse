import { connectDB } from "@/lib/db";
import { oid } from "@/lib/ids";
import { Milestone } from "@/models/Milestone";
import { Project } from "@/models/Project";
import { Task } from "@/models/Task";
import type { MilestoneStatus } from "@/modules/milestones/constants";
import { milestoneSignal, summarizeTasks, type MilestoneProgress, type MilestoneSignal } from "@/modules/milestones/progress";
import type { TaskStatus } from "@/modules/tasks/constants";
import type { WorkspaceScope } from "@/modules/workspaces/access";

export type MilestoneDTO = {
  id: string;
  projectId: string;
  name: string;
  description: string | null;
  startDate: string | null;
  dueDate: string | null;
  status: MilestoneStatus;
  progress: MilestoneProgress;
  signal: MilestoneSignal;
};

type MilestoneRow = {
  _id: unknown;
  projectId: unknown;
  name: string;
  description?: string | null;
  startDate?: Date | null;
  dueDate?: Date | null;
  status: string;
};

function toDTO(m: MilestoneRow, tasks: { status: TaskStatus }[], now: Date): MilestoneDTO {
  const progress = summarizeTasks(tasks);
  const status = m.status as MilestoneStatus;
  return {
    id: String(m._id),
    projectId: String(m.projectId),
    name: m.name,
    description: m.description ?? null,
    startDate: m.startDate?.toISOString() ?? null,
    dueDate: m.dueDate?.toISOString() ?? null,
    status,
    progress,
    signal: milestoneSignal({ status, dueDate: m.dueDate ?? null }, progress, now),
  };
}

/** Caller must have loaded the project through `loadProject` (ownership chain). */
export async function listMilestones(scope: WorkspaceScope, projectId: string): Promise<MilestoneDTO[]> {
  await connectDB();
  const workspaceId = oid(scope.workspace.id);
  const [milestones, tasks] = await Promise.all([
    Milestone.find({ workspaceId, projectId: oid(projectId) }).sort({ dueDate: 1, createdAt: 1 }).lean(),
    Task.find({ workspaceId, projectId: oid(projectId), isArchived: false, milestoneId: { $ne: null } })
      .select("milestoneId status")
      .lean(),
  ]);
  const now = new Date();
  return milestones.map((m) =>
    toDTO(
      m,
      tasks.filter((t) => String(t.milestoneId) === String(m._id)).map((t) => ({ status: t.status as TaskStatus })),
      now,
    ),
  );
}

/** Open milestones across the workspace with the nearest due dates (dashboard). */
export async function listUpcomingMilestones(scope: WorkspaceScope, limit = 5): Promise<(MilestoneDTO & { projectName: string })[]> {
  await connectDB();
  const workspaceId = oid(scope.workspace.id);
  const activeProjects = await Project.find({ workspaceId, archivedAt: null }).select("name").lean();
  const nameOf = new Map(activeProjects.map((p) => [String(p._id), p.name]));
  const milestones = await Milestone.find({
    workspaceId,
    projectId: { $in: activeProjects.map((p) => p._id) },
    status: { $in: ["PLANNED", "ACTIVE"] },
  })
    .sort({ dueDate: 1 })
    .limit(50)
    .lean();
  // Dated milestones first (soonest first), undated last.
  const picked = [...milestones.filter((m) => m.dueDate), ...milestones.filter((m) => !m.dueDate)].slice(0, limit);
  const tasks = await Task.find({ workspaceId, isArchived: false, milestoneId: { $in: picked.map((m) => m._id) } })
    .select("milestoneId status")
    .lean();
  const now = new Date();
  return picked.map((m) => ({
    ...toDTO(
      m,
      tasks.filter((t) => String(t.milestoneId) === String(m._id)).map((t) => ({ status: t.status as TaskStatus })),
      now,
    ),
    projectName: nameOf.get(String(m.projectId)) ?? "",
  }));
}
