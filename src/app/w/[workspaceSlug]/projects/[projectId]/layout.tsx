import Link from "next/link";
import { CountPill } from "@/components/data-display/badges";
import { PageHeader } from "@/components/feedback/states";
import { CreateTaskDialog } from "@/components/project-management/create-task-dialog";
import { ProjectTabs } from "@/components/project-management/project-tabs";
import { orNotFound } from "@/lib/page";
import { listMilestones } from "@/modules/milestones/queries";
import { PROJECT_STATUS_LABELS } from "@/modules/projects/constants";
import { getProjectDetail } from "@/modules/projects/queries";
import { requireWorkspace } from "@/modules/workspaces/access";
import { listMembers } from "@/modules/workspaces/queries";

export default async function ProjectLayout(
  props: LayoutProps<"/w/[workspaceSlug]/projects/[projectId]">,
) {
  const { workspaceSlug, projectId } = await props.params;
  const scope = await requireWorkspace(workspaceSlug);
  const project = await orNotFound(getProjectDetail(scope, projectId));
  const [members, milestones] = await Promise.all([
    listMembers(scope.workspace.id),
    listMilestones(scope, project.id),
  ]);
  const base = `/w/${scope.workspace.slug}/projects/${project.id}`;

  return (
    <>
      <PageHeader
        eyebrow={
          <Link href={`/w/${scope.workspace.slug}/projects`} className="hover:underline">
            Projects
          </Link>
        }
        title={project.name}
        description={
          <>
            {project.statusColor && (
              <CountPill>{PROJECT_STATUS_LABELS[project.statusColor]}</CountPill>
            )}{" "}
            {project.description}
          </>
        }
        actions={
          project.can.editTasks ? (
            <CreateTaskDialog
              slug={scope.workspace.slug}
              projectId={project.id}
              people={members}
              milestones={milestones.filter((m) => m.status !== "DONE" && m.status !== "CANCELLED")}
            />
          ) : null
        }
      />
      <ProjectTabs base={base} />
      {props.children}
    </>
  );
}
