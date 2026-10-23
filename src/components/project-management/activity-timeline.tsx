import Link from "next/link";
import { formatDateTime } from "@/lib/dates";
import { STATUS_LABELS, type TaskStatus } from "@/modules/tasks/constants";

export type TimelineEntry = {
  id: string;
  actorName: string;
  action: string;
  changes: Record<string, { from: unknown; to: unknown }>;
  createdAt: string;
  target?: { label: string; href?: string } | null;
  projectName?: string | null;
};

const FIELD_LABELS: Record<string, string> = {
  title: "title",
  description: "description",
  priority: "priority",
  assigneeIds: "assignees",
  dueDate: "due date",
  estimateHours: "estimate",
  milestoneId: "milestone",
};

/**
 * Plain-language [verb, suffix] around the optional target: "moved <task> to Done".
 * Unknown GG-ops actions fall back to their name.
 */
export function describeActivity(
  action: string,
  changes: TimelineEntry["changes"],
): [string, string] {
  switch (action) {
    case "TASK_CREATED":
      return ["created", ""];
    case "TASK_COMPLETED":
      return ["completed", ""];
    case "COMMENT_ADDED":
      return ["commented on", ""];
    case "PROJECT_CREATED":
      return ["created the project", ""];
    case "PROJECT_UPDATED":
      return ["updated the project", ""];
    case "MILESTONE_CREATED":
      return ["added a milestone to", ""];
    case "MILESTONE_UPDATED":
      return ["updated a milestone in", ""];
    case "TASK_UPDATED": {
      const status = changes.status?.to as TaskStatus | undefined;
      if (status && STATUS_LABELS[status]) return ["moved", `to ${STATUS_LABELS[status]}`];
      const fields = Object.keys(changes).map((f) => FIELD_LABELS[f] ?? f);
      return fields.length ? [`changed the ${fields.join(", ")} of`, ""] : ["updated", ""];
    }
    default:
      return [action.toLowerCase().replace(/_/g, " "), ""];
  }
}

export function ActivityTimeline({ entries, empty }: { entries: TimelineEntry[]; empty: string }) {
  if (!entries.length) return <p className="text-muted-foreground text-sm">{empty}</p>;
  return (
    <ol className="relative space-y-4 border-l pl-4">
      {entries.map((e) => {
        const [verb, suffix] = describeActivity(e.action, e.changes);
        return (
          <li key={e.id} className="relative">
            <span className="bg-border absolute top-1.5 -left-[21px] size-2.5 rounded-full ring-4 ring-background" />
            <p className="text-sm">
              <span className="font-medium">{e.actorName}</span> {verb}
              {e.target && (
                <>
                  {" "}
                  {e.target.href ? (
                    <Link href={e.target.href} className="font-medium hover:underline">
                      {e.target.label}
                    </Link>
                  ) : (
                    e.target.label
                  )}
                </>
              )}
              {suffix && ` ${suffix}`}
            </p>
            <p className="text-muted-foreground text-xs">
              {formatDateTime(e.createdAt)}
              {e.projectName ? ` · ${e.projectName}` : ""}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
