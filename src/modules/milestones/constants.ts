export const MILESTONE_STATUSES = ["PLANNED", "ACTIVE", "DONE", "CANCELLED"] as const;
export type MilestoneStatus = (typeof MILESTONE_STATUSES)[number];

export const MILESTONE_STATUS_LABELS: Record<MilestoneStatus, string> = {
  PLANNED: "Planned",
  ACTIVE: "Active",
  DONE: "Done",
  CANCELLED: "Cancelled",
};
