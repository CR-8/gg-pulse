import { CheckCircle2 } from "lucide-react";
import type { Metadata } from "next";
import { EmptyState, PageHeader } from "@/components/feedback/states";
import { TaskTable } from "@/components/project-management/task-table";
import { isPastDue } from "@/lib/dates";
import { listMyTasks, type MyTaskDTO } from "@/modules/tasks/queries";
import { allows, requireWorkspace } from "@/modules/workspaces/access";
import { listMembers } from "@/modules/workspaces/queries";

export const metadata: Metadata = { title: "My tasks" };

const WEEK = 7 * 24 * 60 * 60 * 1000;

function groupByDueDate(tasks: MyTaskDTO[]) {
  const weekOut = Date.now() + WEEK;
  return [
    { title: "Overdue", tasks: tasks.filter((t) => isPastDue(t.dueDate)) },
    {
      title: "Due in the next 7 days",
      tasks: tasks.filter(
        (t) => t.dueDate && !isPastDue(t.dueDate) && new Date(t.dueDate).getTime() < weekOut,
      ),
    },
    {
      title: "Later",
      tasks: tasks.filter((t) => t.dueDate && new Date(t.dueDate).getTime() >= weekOut),
    },
    { title: "No due date", tasks: tasks.filter((t) => !t.dueDate) },
  ].filter((g) => g.tasks.length);
}

export default async function MyTasksPage(props: PageProps<"/w/[workspaceSlug]/tasks">) {
  const { workspaceSlug } = await props.params;
  const scope = await requireWorkspace(workspaceSlug);
  const [tasks, members] = await Promise.all([listMyTasks(scope), listMembers(scope.workspace.id)]);
  const canEdit = allows(scope, "task.update");

  const groups = groupByDueDate(tasks);

  return (
    <>
      <PageHeader
        title="My tasks"
        description="Open tasks assigned to you across this workspace's projects."
      />
      {groups.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="You're all clear"
          description="No open tasks are assigned to you right now."
        />
      ) : (
        <div className="grid gap-8">
          {groups.map((g) => (
            <section key={g.title}>
              <h2 className="mb-2 text-sm font-semibold">
                {g.title}{" "}
                <span className="text-muted-foreground font-normal">{g.tasks.length}</span>
              </h2>
              <TaskTable
                slug={scope.workspace.slug}
                tasks={g.tasks}
                people={members}
                canEdit={canEdit}
                contextLabel="Project"
                contextOf={(t) => t.projectName ?? ""}
              />
            </section>
          ))}
        </div>
      )}
    </>
  );
}
