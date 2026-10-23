import { connectDB } from "@/lib/db";
import { isPastDue } from "@/lib/dates";
import { notFoundError } from "@/lib/errors";
import { oid, toObjectId } from "@/lib/ids";
import { plainText } from "@/lib/utils";
import { ActivityLog } from "@/models/ActivityLog";
import { Comment } from "@/models/Comment";
import { Milestone } from "@/models/Milestone";
import { Project } from "@/models/Project";
import { Task, type TaskDoc } from "@/models/Task";
import { User } from "@/models/User";
import type { TaskPriority, TaskStatus } from "@/modules/tasks/constants";
import type { WorkspaceScope } from "@/modules/workspaces/access";

export type TaskDTO = {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeIds: string[];
  dueDate: string | null;
  estimateHours: number | null;
  milestoneId: string | null;
  isOverdue: boolean;
  updatedAt: string;
};

type TaskRow = Pick<
  TaskDoc,
  | "projectId"
  | "title"
  | "description"
  | "status"
  | "priority"
  | "assigneeIds"
  | "dueDate"
  | "estimateHours"
  | "milestoneId"
> & { _id: unknown; updatedAt?: Date };

export function toTaskDTO(t: TaskRow): TaskDTO {
  const status = t.status as TaskStatus;
  return {
    id: String(t._id),
    projectId: String(t.projectId),
    title: t.title,
    // GG-ops stores editor HTML; shown here as text.
    description: plainText(t.description),
    status,
    priority: t.priority as TaskPriority,
    assigneeIds: (t.assigneeIds ?? []).map(String),
    dueDate: t.dueDate?.toISOString() ?? null,
    estimateHours: t.estimateHours ?? null,
    milestoneId: t.milestoneId ? String(t.milestoneId) : null,
    isOverdue: status !== "DONE" && isPastDue(t.dueDate),
    updatedAt: (t.updatedAt ?? new Date(0)).toISOString(),
  };
}

const TASK_FIELDS =
  "projectId title description status priority assigneeIds dueDate estimateHours milestoneId updatedAt";

/** Caller must have loaded the project through `loadProject` (ownership chain). */
export async function listProjectTasks(
  scope: WorkspaceScope,
  projectId: string,
): Promise<TaskDTO[]> {
  await connectDB();
  const tasks = await Task.find({
    workspaceId: oid(scope.workspace.id),
    projectId: oid(projectId),
    isArchived: false,
  })
    .select(TASK_FIELDS)
    .sort({ position: 1, createdAt: 1 })
    .lean();
  return tasks.map(toTaskDTO);
}

export type MyTaskDTO = TaskDTO & { projectName: string };

/** Open tasks assigned to the actor, soonest due first, undated last. */
export async function listMyTasks(
  scope: WorkspaceScope,
  includeDone = false,
): Promise<MyTaskDTO[]> {
  await connectDB();
  const workspaceId = oid(scope.workspace.id);
  const projects = await Project.find({ workspaceId, archivedAt: null }).select("name").lean();
  const nameOf = new Map(projects.map((p) => [String(p._id), p.name]));
  const tasks = await Task.find({
    workspaceId,
    assigneeIds: oid(scope.actor.id),
    isArchived: false,
    projectId: { $in: projects.map((p) => p._id) },
    ...(includeDone ? {} : { status: { $ne: "DONE" as const } }),
  })
    .select(TASK_FIELDS)
    .sort({ dueDate: 1, updatedAt: -1 })
    .limit(500)
    .lean();
  const dated = tasks.filter((t) => t.dueDate);
  const undated = tasks.filter((t) => !t.dueDate);
  return [...dated, ...undated].map((t) => ({
    ...toTaskDTO(t),
    projectName: nameOf.get(String(t.projectId)) ?? "",
  }));
}

export type CommentDTO = { id: string; authorId: string; body: string; createdAt: string };
export type ActivityDTO = {
  id: string;
  actorId: string | null;
  action: string;
  changes: Record<string, { from: unknown; to: unknown }>;
  createdAt: string;
};
export type TaskDetailDTO = {
  task: TaskDTO & { createdAt: string; completedAt: string | null; createdBy: string };
  milestoneName: string | null;
  comments: CommentDTO[];
  activity: ActivityDTO[];
  people: Record<string, string>;
};

export async function getTaskDetail(
  scope: WorkspaceScope,
  projectId: string,
  taskId: string,
): Promise<TaskDetailDTO> {
  const id = toObjectId(taskId);
  if (!id) throw notFoundError("Task");
  await connectDB();
  const workspaceId = oid(scope.workspace.id);
  const task = await Task.findOne({
    _id: id,
    workspaceId,
    projectId: oid(projectId),
    isArchived: false,
  }).lean();
  if (!task) throw notFoundError("Task");

  const [comments, activity, milestone] = await Promise.all([
    Comment.find({ workspaceId, taskId: id, deletedAt: null })
      .sort({ createdAt: 1 })
      .limit(500)
      .lean(),
    ActivityLog.find({ workspaceId, taskId: id }).sort({ createdAt: -1 }).limit(100).lean(),
    task.milestoneId
      ? Milestone.findOne({ _id: task.milestoneId, workspaceId }).select("name").lean()
      : null,
  ]);

  // Authors may have left the workspace; their names still resolve for history.
  const personIds = new Set<string>([String(task.createdBy)]);
  comments.forEach((c) => personIds.add(String(c.authorId)));
  activity.forEach((a) => a.actorId && personIds.add(String(a.actorId)));
  const users = await User.find({ _id: { $in: [...personIds].map(oid) } })
    .select("name")
    .lean();

  return {
    task: {
      ...toTaskDTO(task),
      createdAt: task.createdAt.toISOString(),
      completedAt: task.completedAt?.toISOString() ?? null,
      createdBy: String(task.createdBy),
    },
    milestoneName: milestone?.name ?? null,
    comments: comments.map((c) => ({
      id: String(c._id),
      authorId: String(c.authorId),
      body: plainText(c.body),
      createdAt: c.createdAt.toISOString(),
    })),
    activity: activity.map((a) => ({
      id: String(a._id),
      actorId: a.actorId ? String(a.actorId) : null,
      action: a.action,
      changes: (a.metadata as { changes?: ActivityDTO["changes"] } | undefined)?.changes ?? {},
      createdAt: a.createdAt.toISOString(),
    })),
    people: Object.fromEntries(users.map((u) => [String(u._id), u.name])),
  };
}

export type WorkspaceOverview = {
  activeProjects: number;
  openTasks: number;
  overdueTasks: number;
  blockedTasks: number;
  myOpenTasks: number;
  dueThisWeek: number;
};

export async function getWorkspaceOverview(scope: WorkspaceScope): Promise<WorkspaceOverview> {
  await connectDB();
  const workspaceId = oid(scope.workspace.id);
  const projects = await Project.find({ workspaceId, archivedAt: null }).select("_id").lean();
  const projectId = { $in: projects.map((p) => p._id) };
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const weekEnd = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  const open = { workspaceId, isArchived: false, projectId, status: { $ne: "DONE" as const } };
  const [openTasks, overdueTasks, blockedTasks, myOpenTasks, dueThisWeek] = await Promise.all([
    Task.countDocuments(open),
    Task.countDocuments({ ...open, dueDate: { $lt: today } }),
    Task.countDocuments({ ...open, status: "BLOCKED" }),
    Task.countDocuments({ ...open, assigneeIds: oid(scope.actor.id) }),
    Task.countDocuments({ ...open, dueDate: { $gte: today, $lt: weekEnd } }),
  ]);
  return {
    activeProjects: projects.length,
    openTasks,
    overdueTasks,
    blockedTasks,
    myOpenTasks,
    dueThisWeek,
  };
}

export type RecentActivityDTO = ActivityDTO & {
  actorName: string;
  projectId: string | null;
  projectName: string | null;
  taskId: string | null;
  taskTitle: string | null;
};

export async function listRecentActivity(
  scope: WorkspaceScope,
  limit = 12,
): Promise<RecentActivityDTO[]> {
  await connectDB();
  const workspaceId = oid(scope.workspace.id);
  const rows = await ActivityLog.find({ workspaceId, entityType: { $in: ["TASK", "PROJECT"] } })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
  const ids = (key: "actorId" | "projectId" | "taskId") =>
    [
      ...new Set(
        rows
          .map((r) => r[key])
          .filter(Boolean)
          .map(String),
      ),
    ].map(oid);
  const [users, projects, tasks] = await Promise.all([
    User.find({ _id: { $in: ids("actorId") } })
      .select("name")
      .lean(),
    Project.find({ _id: { $in: ids("projectId") }, workspaceId })
      .select("name")
      .lean(),
    Task.find({ _id: { $in: ids("taskId") }, workspaceId })
      .select("title")
      .lean(),
  ]);
  const userName = new Map(users.map((u) => [String(u._id), u.name]));
  const projectName = new Map(projects.map((p) => [String(p._id), p.name]));
  const taskTitle = new Map(tasks.map((t) => [String(t._id), t.title]));
  return rows.map((a) => ({
    id: String(a._id),
    actorId: a.actorId ? String(a.actorId) : null,
    actorName: (a.actorId && userName.get(String(a.actorId))) || "Someone",
    action: a.action,
    changes: (a.metadata as { changes?: ActivityDTO["changes"] } | undefined)?.changes ?? {},
    createdAt: a.createdAt.toISOString(),
    projectId: a.projectId ? String(a.projectId) : null,
    projectName: (a.projectId && projectName.get(String(a.projectId))) || null,
    taskId: a.taskId ? String(a.taskId) : null,
    taskTitle: (a.taskId && taskTitle.get(String(a.taskId))) || null,
  }));
}
