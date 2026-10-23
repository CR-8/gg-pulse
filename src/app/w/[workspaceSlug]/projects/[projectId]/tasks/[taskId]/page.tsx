import type { Metadata } from "next";
import { UserAvatar } from "@/components/data-display/people";
import { ActivityTimeline } from "@/components/project-management/activity-timeline";
import { toFormValues } from "@/components/project-management/task-form";
import { CommentForm, TaskEditor } from "@/components/project-management/task-editor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatDateTime } from "@/lib/dates";
import { orNotFound } from "@/lib/page";
import { listMilestones } from "@/modules/milestones/queries";
import { getProjectDetail } from "@/modules/projects/queries";
import { getTaskDetail } from "@/modules/tasks/queries";
import { requireWorkspace } from "@/modules/workspaces/access";
import { listMembers } from "@/modules/workspaces/queries";

export const metadata: Metadata = { title: "Task" };

export default async function TaskPage(
  props: PageProps<"/w/[workspaceSlug]/projects/[projectId]/tasks/[taskId]">,
) {
  const { workspaceSlug, projectId, taskId } = await props.params;
  const scope = await requireWorkspace(workspaceSlug);
  const project = await orNotFound(getProjectDetail(scope, projectId));
  const [detail, members, milestones] = await Promise.all([
    orNotFound(getTaskDetail(scope, project.id, taskId)),
    listMembers(scope.workspace.id),
    listMilestones(scope, project.id),
  ]);
  const { task, people } = detail;
  const nameOf = (id: string | null) => (id && people[id]) || "Someone";
  // Keep the task's current milestone selectable even if it has been closed since.
  const selectable = milestones.filter(
    (m) => (m.status !== "DONE" && m.status !== "CANCELLED") || m.id === task.milestoneId,
  );

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="grid content-start gap-6 lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {project.can.editTasks ? "Edit task" : "Task"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TaskEditor
              slug={scope.workspace.slug}
              taskId={task.id}
              values={toFormValues(task)}
              people={members}
              milestones={selectable}
              readOnly={!project.can.editTasks}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Comments</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5">
            {detail.comments.length === 0 && (
              <p className="text-muted-foreground text-sm">No comments yet.</p>
            )}
            {detail.comments.map((c) => (
              <div key={c.id} className="flex gap-3">
                <UserAvatar
                  person={{ userId: c.authorId, name: nameOf(c.authorId) }}
                  className="size-8 text-xs"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    <span className="font-medium">{nameOf(c.authorId)}</span>{" "}
                    <span className="text-muted-foreground text-xs">
                      {formatDateTime(c.createdAt)}
                    </span>
                  </p>
                  <p className="mt-1 text-sm whitespace-pre-wrap">{c.body}</p>
                </div>
              </div>
            ))}
            {project.can.comment && <CommentForm slug={scope.workspace.slug} taskId={task.id} />}
          </CardContent>
        </Card>
      </div>

      <div className="grid content-start gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Created by</dt>
              <dd>{nameOf(task.createdBy)}</dd>
              <dt className="text-muted-foreground">Created</dt>
              <dd>{formatDate(task.createdAt)}</dd>
              <dt className="text-muted-foreground">Milestone</dt>
              <dd>{detail.milestoneName ?? "—"}</dd>
              {task.completedAt && (
                <>
                  <dt className="text-muted-foreground">Completed</dt>
                  <dd>{formatDate(task.completedAt)}</dd>
                </>
              )}
            </dl>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityTimeline
              empty="No activity yet."
              entries={detail.activity.map((a) => ({
                ...a,
                actorName: nameOf(a.actorId),
                target: { label: "this task" },
              }))}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
