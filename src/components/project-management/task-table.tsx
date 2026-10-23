import Link from "next/link";
import { PriorityBadge } from "@/components/data-display/badges";
import { AvatarStack, type Person } from "@/components/data-display/people";
import { TaskStatusMenu } from "@/components/project-management/task-status-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { TaskDTO } from "@/modules/tasks/queries";

type Row = TaskDTO & { projectName?: string };

/** Dense list of tasks; the last column shows the milestone, or the project in cross-project lists. */
export function TaskTable({
  slug,
  tasks,
  people,
  contextLabel,
  contextOf,
  canEdit,
}: {
  slug: string;
  tasks: Row[];
  people: Person[];
  contextLabel: string;
  contextOf: (task: Row) => string;
  canEdit: boolean;
}) {
  const personOf = new Map(people.map((p) => [p.userId, p]));
  return (
    <div className="bg-card overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-56">Task</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Assignees</TableHead>
            <TableHead>Due</TableHead>
            <TableHead className="text-right">Estimate</TableHead>
            <TableHead>{contextLabel}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map((t) => (
            <TableRow key={t.id}>
              <TableCell className="max-w-80">
                <Link
                  href={`/w/${slug}/projects/${t.projectId}/tasks/${t.id}`}
                  className="block truncate font-medium hover:underline"
                >
                  {t.title}
                </Link>
              </TableCell>
              <TableCell>
                <TaskStatusMenu slug={slug} taskId={t.id} status={t.status} disabled={!canEdit} />
              </TableCell>
              <TableCell>
                <PriorityBadge priority={t.priority} />
              </TableCell>
              <TableCell>
                <AvatarStack
                  people={t.assigneeIds
                    .map((id) => personOf.get(id))
                    .filter((p): p is Person => !!p)}
                />
              </TableCell>
              <TableCell
                className={cn(
                  "text-xs whitespace-nowrap",
                  t.isOverdue ? "text-destructive font-medium" : "text-muted-foreground",
                )}
              >
                {t.dueDate ? formatDate(t.dueDate) : "—"}
              </TableCell>
              <TableCell className="text-muted-foreground text-right text-xs tabular-nums">
                {t.estimateHours === null ? "—" : `${t.estimateHours}h`}
              </TableCell>
              <TableCell className="text-muted-foreground max-w-48 truncate text-xs">
                {contextOf(t) || "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
