import { Clock, Flag, Plus } from "lucide-react";
import Link from "next/link";
import { PriorityBadge } from "@/components/data-display/badges";
import { AvatarStack, type Person } from "@/components/data-display/people";
import { CreateTaskDialog } from "@/components/project-management/create-task-dialog";
import { TaskStatusMenu } from "@/components/project-management/task-status-menu";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { BOARD_COLUMNS, STATUS_LABELS } from "@/modules/tasks/constants";
import type { TaskDTO } from "@/modules/tasks/queries";

type Props = {
  slug: string;
  projectId: string;
  tasks: TaskDTO[];
  people: Person[];
  milestones: { id: string; name: string; status: string }[];
  canEdit: boolean;
};

export function TaskBoard({ slug, projectId, tasks, people, milestones, canEdit }: Props) {
  const personOf = new Map(people.map((p) => [p.userId, p]));
  const milestoneOf = new Map(milestones.map((m) => [m.id, m.name]));
  const openMilestones = milestones.filter((m) => m.status !== "DONE" && m.status !== "CANCELLED");
  const base = `/w/${slug}/projects/${projectId}`;

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {BOARD_COLUMNS.map((status) => {
        const column = tasks.filter((t) => t.status === status);
        return (
          <section
            key={status}
            className="bg-muted/60 flex flex-col rounded-lg border p-3"
            aria-label={STATUS_LABELS[status]}
          >
            <header className="mb-3 flex items-center justify-between px-1">
              <h2 className="text-sm font-semibold">
                {STATUS_LABELS[status]}{" "}
                <span className="text-muted-foreground font-normal tabular-nums">
                  {column.length}
                </span>
              </h2>
              {canEdit && (
                <CreateTaskDialog
                  slug={slug}
                  projectId={projectId}
                  people={people}
                  milestones={openMilestones}
                  status={status}
                  trigger={
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      aria-label={`Add a task to ${STATUS_LABELS[status]}`}
                    >
                      <Plus />
                    </Button>
                  }
                />
              )}
            </header>
            <ul className="grid gap-2">
              {column.map((t) => (
                <li key={t.id} className="bg-card rounded-md border p-3 shadow-xs">
                  <Link
                    href={`${base}/tasks/${t.id}`}
                    className="line-clamp-3 text-sm font-medium hover:underline"
                  >
                    {t.title}
                  </Link>
                  {t.milestoneId && milestoneOf.get(t.milestoneId) && (
                    <p className="text-muted-foreground mt-1 flex items-center gap-1 truncate text-xs">
                      <Flag className="size-3 shrink-0" /> {milestoneOf.get(t.milestoneId)}
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <TaskStatusMenu
                      slug={slug}
                      taskId={t.id}
                      status={t.status}
                      disabled={!canEdit}
                    />
                    <PriorityBadge priority={t.priority} />
                    {t.estimateHours !== null && (
                      <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
                        <Clock className="size-3" /> {t.estimateHours}h
                      </span>
                    )}
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <AvatarStack
                      people={t.assigneeIds
                        .map((id) => personOf.get(id))
                        .filter((p): p is Person => !!p)}
                    />
                    {t.dueDate && (
                      <span
                        className={cn(
                          "text-xs",
                          t.isOverdue ? "text-destructive font-medium" : "text-muted-foreground",
                        )}
                      >
                        {t.isOverdue ? "Overdue · " : ""}
                        {formatDate(t.dueDate)}
                      </span>
                    )}
                  </div>
                </li>
              ))}
              {column.length === 0 && (
                <li className="text-muted-foreground px-1 py-6 text-center text-xs">No tasks</li>
              )}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
