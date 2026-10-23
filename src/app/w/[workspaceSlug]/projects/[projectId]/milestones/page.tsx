import { Flag } from "lucide-react";
import type { Metadata } from "next";
import { SignalBadge } from "@/components/data-display/badges";
import { EmptyState } from "@/components/feedback/states";
import { CreateMilestoneDialog } from "@/components/project-management/milestone-dialog";
import { MilestoneStatusSelect } from "@/components/project-management/milestone-status-select";
import { Progress } from "@/components/ui/progress";
import { formatDate } from "@/lib/dates";
import { orNotFound } from "@/lib/page";
import { MILESTONE_STATUS_LABELS } from "@/modules/milestones/constants";
import { listMilestones } from "@/modules/milestones/queries";
import { getProjectDetail } from "@/modules/projects/queries";
import { allows, requireWorkspace } from "@/modules/workspaces/access";

export const metadata: Metadata = { title: "Milestones" };

export default async function MilestonesPage(
  props: PageProps<"/w/[workspaceSlug]/projects/[projectId]/milestones">,
) {
  const { workspaceSlug, projectId } = await props.params;
  const scope = await requireWorkspace(workspaceSlug);
  const project = await orNotFound(getProjectDetail(scope, projectId));
  const milestones = await listMilestones(scope, project.id);
  const canManage = allows(scope, "milestone.manage", project.projectRole);
  const create = canManage ? (
    <CreateMilestoneDialog slug={scope.workspace.slug} projectId={project.id} />
  ) : null;

  if (!milestones.length) {
    return (
      <EmptyState
        icon={Flag}
        title="No milestones yet"
        description={
          canManage
            ? "Milestones are dated checkpoints. Attach tasks to one and gg-pulse shows whether it is on track, and why."
            : "Project managers and admins can add milestones."
        }
        action={create}
      />
    );
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-2">
        <p className="text-muted-foreground text-sm">
          Signals are rule-based: overdue, blocked tasks, or under 75% done within 7 days of the due
          date.
        </p>
        {create}
      </div>
      <ul className="grid gap-3">
        {milestones.map((m) => (
          <li key={m.id} className="bg-card rounded-lg border p-4">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-semibold">{m.name}</h2>
              <SignalBadge level={m.signal.level} />
              <div className="ml-auto flex items-center gap-3">
                <span className="text-muted-foreground text-xs">
                  {m.startDate ? `${formatDate(m.startDate)} → ` : ""}
                  {m.dueDate ? `due ${formatDate(m.dueDate)}` : "no due date"}
                </span>
                {canManage ? (
                  <MilestoneStatusSelect
                    slug={scope.workspace.slug}
                    milestoneId={m.id}
                    status={m.status}
                  />
                ) : (
                  <span className="text-muted-foreground text-xs">
                    {MILESTONE_STATUS_LABELS[m.status]}
                  </span>
                )}
              </div>
            </div>
            {m.description && <p className="text-muted-foreground mt-1 text-sm">{m.description}</p>}
            <div className="mt-3 flex items-center gap-3">
              <Progress
                value={m.progress.percent}
                className="h-1.5"
                aria-label={`${m.progress.percent}% of tasks done`}
              />
              <span className="text-muted-foreground w-36 shrink-0 text-right text-xs tabular-nums">
                {m.progress.done}/{m.progress.total} done
                {m.progress.blocked ? ` · ${m.progress.blocked} blocked` : ""}
              </span>
            </div>
            <p className="text-muted-foreground mt-2 text-xs">{m.signal.reason}</p>
          </li>
        ))}
      </ul>
    </>
  );
}
