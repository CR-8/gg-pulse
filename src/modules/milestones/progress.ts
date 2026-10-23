import type { MilestoneStatus } from "@/modules/milestones/constants";
import type { TaskStatus } from "@/modules/tasks/constants";

export type MilestoneProgress = {
  total: number;
  done: number;
  blocked: number;
  open: number;
  percent: number;
};

export function summarizeTasks(tasks: { status: TaskStatus }[]): MilestoneProgress {
  const done = tasks.filter((t) => t.status === "DONE").length;
  const blocked = tasks.filter((t) => t.status === "BLOCKED").length;
  const total = tasks.length;
  return {
    total,
    done,
    blocked,
    open: total - done,
    percent: total ? Math.round((done / total) * 100) : 0,
  };
}

export type SignalLevel = "CLOSED" | "EMPTY" | "OVERDUE" | "AT_RISK" | "ON_TRACK" | "NO_DATE";
export type MilestoneSignal = { level: SignalLevel; reason: string };

const DAY = 24 * 60 * 60 * 1000;
export const AT_RISK_WINDOW_DAYS = 7;
export const AT_RISK_MIN_PERCENT = 75;

/**
 * Deterministic delivery signal for one milestone (docs/PROJECT-HEALTH-MODEL.md, rule set v0).
 * Count-based on purpose: estimates are optional, so weighting by them would silently skew.
 */
export function milestoneSignal(
  milestone: { status: MilestoneStatus; dueDate: Date | null },
  progress: MilestoneProgress,
  now: Date,
): MilestoneSignal {
  if (milestone.status === "DONE" || milestone.status === "CANCELLED") {
    return { level: "CLOSED", reason: milestone.status === "DONE" ? "Marked done." : "Cancelled." };
  }
  if (progress.total === 0) return { level: "EMPTY", reason: "No tasks attached yet." };

  const blockedNote = progress.blocked
    ? `${progress.blocked} blocked task${progress.blocked === 1 ? "" : "s"}`
    : "";
  if (!milestone.dueDate) {
    return blockedNote
      ? { level: "AT_RISK", reason: `${blockedNote}; no due date set.` }
      : { level: "NO_DATE", reason: `No due date set; ${progress.percent}% of tasks done.` };
  }

  // Whole days until the due date, counted from the start of today (UTC), so "due today" is 0.
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const daysLeft = Math.round((milestone.dueDate.getTime() - today) / DAY);
  if (daysLeft < 0 && progress.open > 0) {
    return {
      level: "OVERDUE",
      reason: `Due ${-daysLeft} day${daysLeft === -1 ? "" : "s"} ago; ${progress.open} task${progress.open === 1 ? "" : "s"} still open.`,
    };
  }
  if (blockedNote) return { level: "AT_RISK", reason: `${blockedNote}.` };
  if (
    progress.open > 0 &&
    daysLeft <= AT_RISK_WINDOW_DAYS &&
    progress.percent < AT_RISK_MIN_PERCENT
  ) {
    return {
      level: "AT_RISK",
      reason: `${daysLeft} day${daysLeft === 1 ? "" : "s"} left and ${progress.percent}% of tasks done.`,
    };
  }
  return {
    level: "ON_TRACK",
    reason:
      progress.open === 0
        ? "All tasks done."
        : `${progress.percent}% of tasks done, due in ${daysLeft} day${daysLeft === 1 ? "" : "s"}.`,
  };
}
