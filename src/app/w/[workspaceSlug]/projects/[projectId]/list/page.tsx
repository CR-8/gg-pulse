import { ListTodo } from "lucide-react";
import type { Metadata } from "next";
import { EmptyState } from "@/components/feedback/states";
import { TaskTable } from "@/components/project-management/task-table";
import { orNotFound } from "@/lib/page";
import { listMilestones } from "@/modules/milestones/queries";
import { getProjectDetail } from "@/modules/projects/queries";
import { listProjectTasks } from "@/modules/tasks/queries";
import { requireWorkspace } from "@/modules/workspaces/access";
import { listMembers } from "@/modules/workspaces/queries";

export const metadata: Metadata = { title: "List" };

export default async function ProjectListPage(
  props: PageProps<"/w/[workspaceSlug]/projects/[projectId]/list">,
) {
  const { workspaceSlug, projectId } = await props.params;
  const scope = await requireWorkspace(workspaceSlug);
  const project = await orNotFound(getProjectDetail(scope, projectId));
  const [tasks, members, milestones] = await Promise.all([
    listProjectTasks(scope, project.id),
    listMembers(scope.workspace.id),
    listMilestones(scope, project.id),
  ]);
  if (!tasks.length) {
    return (
      <EmptyState
        icon={ListTodo}
        title="No tasks in this project"
        description={
          project.can.editTasks
            ? "Use “New task” above to add the first one."
            : "Tasks will appear here when your team adds them."
        }
      />
    );
  }
  const milestoneName = new Map(milestones.map((m) => [m.id, m.name]));
  return (
    <TaskTable
      slug={scope.workspace.slug}
      tasks={tasks}
      people={members}
      canEdit={project.can.editTasks}
      contextLabel="Milestone"
      contextOf={(t) => (t.milestoneId ? (milestoneName.get(t.milestoneId) ?? "") : "")}
    />
  );
}
