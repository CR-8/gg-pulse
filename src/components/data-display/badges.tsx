import { AlertTriangle, ArrowDown, ArrowUp, CheckCircle2, Circle, CircleDashed, CircleDot, Equal, OctagonAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SignalLevel } from "@/modules/milestones/progress";
import { PRIORITY_LABELS, STATUS_LABELS, type TaskPriority, type TaskStatus } from "@/modules/tasks/constants";

const pill = "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap";

const STATUS_STYLE: Record<TaskStatus, { className: string; icon: typeof Circle }> = {
  TODO: { className: "bg-secondary text-secondary-foreground", icon: Circle },
  IN_PROGRESS: { className: "bg-info-soft text-info", icon: CircleDot },
  BLOCKED: { className: "bg-danger-soft text-destructive", icon: OctagonAlert },
  DONE: { className: "bg-success-soft text-success", icon: CheckCircle2 },
};

export function StatusBadge({ status, className }: { status: TaskStatus; className?: string }) {
  const { className: tone, icon: Icon } = STATUS_STYLE[status];
  return (
    <span className={cn(pill, tone, className)}>
      <Icon className="size-3" />
      {STATUS_LABELS[status]}
    </span>
  );
}

const PRIORITY_ICON: Record<TaskPriority, typeof ArrowUp> = {
  LOW: ArrowDown,
  MEDIUM: Equal,
  HIGH: ArrowUp,
  URGENT: AlertTriangle,
};

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const Icon = PRIORITY_ICON[priority];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs",
        priority === "URGENT" ? "text-destructive font-medium" : priority === "HIGH" ? "text-warning" : "text-muted-foreground",
      )}
    >
      <Icon className="size-3" />
      {PRIORITY_LABELS[priority]}
    </span>
  );
}

const SIGNAL: Record<SignalLevel, { label: string; className: string; icon: typeof Circle }> = {
  CLOSED: { label: "Closed", className: "bg-secondary text-muted-foreground", icon: CheckCircle2 },
  EMPTY: { label: "No tasks", className: "bg-secondary text-muted-foreground", icon: CircleDashed },
  NO_DATE: { label: "No date", className: "bg-secondary text-muted-foreground", icon: CircleDashed },
  ON_TRACK: { label: "On track", className: "bg-success-soft text-success", icon: CheckCircle2 },
  AT_RISK: { label: "At risk", className: "bg-warning-soft text-warning", icon: AlertTriangle },
  OVERDUE: { label: "Overdue", className: "bg-danger-soft text-destructive", icon: OctagonAlert },
};

export function SignalBadge({ level }: { level: SignalLevel }) {
  const { label, className, icon: Icon } = SIGNAL[level];
  return (
    <span className={cn(pill, className)}>
      <Icon className="size-3" />
      {label}
    </span>
  );
}

export function CountPill({ children, tone = "muted" }: { children: React.ReactNode; tone?: "muted" | "danger" | "warning" }) {
  return (
    <span
      className={cn(
        pill,
        tone === "danger" ? "bg-danger-soft text-destructive" : tone === "warning" ? "bg-warning-soft text-warning" : "bg-secondary text-muted-foreground",
      )}
    >
      {children}
    </span>
  );
}
