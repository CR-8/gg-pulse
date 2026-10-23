import { FolderKanban } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { CountPill } from "@/components/data-display/badges";
import { EmptyState, PageHeader } from "@/components/feedback/states";
import { CreateProjectDialog } from "@/components/project-management/create-project-dialog";
import { Progress } from "@/components/ui/progress";
import { PROJECT_STATUS_LABELS } from "@/modules/projects/constants";
import { listProjects } from "@/modules/projects/queries";
import { allows, requireWorkspace } from "@/modules/workspaces/access";

export const metadata: Metadata = { title: "Projects" };

export default async function ProjectsPage(props: PageProps<"/w/[workspaceSlug]/projects">) {
  const { workspaceSlug } = await props.params;
  const { new: openNew } = await props.searchParams;
  const scope = await requireWorkspace(workspaceSlug);
  const projects = await listProjects(scope);
  const canCreate = allows(scope, "project.create");
  const create = canCreate ? (
    <CreateProjectDialog slug={scope.workspace.slug} defaultOpen={openNew === "1"} />
  ) : null;

  return (
    <>
      <PageHeader
        title="Projects"
        description="Plan work into projects, milestones and tasks."
        actions={projects.length ? create : null}
      />
      {projects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No projects yet"
          description={
            canCreate
              ? "Create a project to start planning milestones and tasks. It works without connecting GitHub."
              : "Projects created by your team will appear here. Viewers can't create projects."
          }
          action={create}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((p) => {
            const percent = p.counts.total ? Math.round((p.counts.done / p.counts.total) * 100) : 0;
            return (
              <Link
                key={p.id}
                href={`/w/${scope.workspace.slug}/projects/${p.id}`}
                className="bg-card hover:border-primary/50 flex flex-col rounded-lg border p-5 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-semibold">{p.name}</h2>
                  {p.statusColor && <CountPill>{PROJECT_STATUS_LABELS[p.statusColor]}</CountPill>}
                </div>
                <p className="text-muted-foreground mt-1 line-clamp-2 min-h-10 text-sm">
                  {p.description || "No objective written yet."}
                </p>
                <div className="mt-4 flex items-center gap-3">
                  <Progress
                    value={percent}
                    className="h-1.5"
                    aria-label={`${percent}% of tasks done`}
                  />
                  <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                    {p.counts.done}/{p.counts.total}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <CountPill>{p.counts.total - p.counts.done} open</CountPill>
                  {p.counts.blocked > 0 && (
                    <CountPill tone="danger">{p.counts.blocked} blocked</CountPill>
                  )}
                  {p.counts.overdue > 0 && (
                    <CountPill tone="warning">{p.counts.overdue} overdue</CountPill>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
