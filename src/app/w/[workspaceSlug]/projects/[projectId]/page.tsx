import type { Metadata } from "next";
import { TaskBoard } from "@/components/project-management/task-board";
import { orNotFound } from "@/lib/page";
import { listMilestones } from "@/modules/milestones/queries";
import { getProjectDetail } from "@/modules/projects/queries";
import { listProjectTasks } from "@/modules/tasks/queries";
import { requireWorkspace } from "@/modules/workspaces/access";
import { listMembers } from "@/modules/workspaces/queries";

export const metadata: Metadata = { title: "Board" };

export default async function ProjectBoardPage(
  props: PageProps<"/w/[workspaceSlug]/projects/[projectId]">,
) {
  const { workspaceSlug, projectId } = await props.params;
  const scope = await requireWorkspace(workspaceSlug);
  const project = await orNotFound(getProjectDetail(scope, projectId));
  const [tasks, members, milestones] = await Promise.all([
    listProjectTasks(scope, project.id),
    listMembers(scope.workspace.id),
    listMilestones(scope, project.id),
  ]);
  return (
    <TaskBoard
      slug={scope.workspace.slug}
      projectId={project.id}
      tasks={tasks}
      people={members}
      milestones={milestones}
      canEdit={project.can.editTasks}
    />
  );
}
