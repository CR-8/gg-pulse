// GG-ops values (shared tasks collection). Never write a value outside these lists.
export const TASK_STATUSES = ["TODO", "IN_PROGRESS", "DONE", "BLOCKED"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const TASK_TYPES = ["TASK", "BUG", "FEATURE", "CHORE", "MILESTONE"] as const;
export type TaskType = (typeof TASK_TYPES)[number];

export const STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: "To do",
  IN_PROGRESS: "In progress",
  BLOCKED: "Blocked",
  DONE: "Done",
};

/** Board column order: blocked work sits next to in-progress so it is not missed. */
export const BOARD_COLUMNS: TaskStatus[] = ["TODO", "IN_PROGRESS", "BLOCKED", "DONE"];

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
};

export const MAX_ASSIGNEES = 10;
