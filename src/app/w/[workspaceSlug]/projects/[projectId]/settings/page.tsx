import type { Metadata } from "next";
import { UserAvatar } from "@/components/data-display/people";
import {
  ArchiveProjectButton,
  ProjectDetailsForm,
  ProjectRoleSelect,
} from "@/components/project-management/project-settings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { orNotFound } from "@/lib/page";
import { getProjectDetail } from "@/modules/projects/queries";
import { requireWorkspace } from "@/modules/workspaces/access";
import { PROJECT_ROLE_LABELS, ROLE_LABELS } from "@/modules/workspaces/roles";
import { listMembers } from "@/modules/workspaces/queries";

export const metadata: Metadata = { title: "Project settings" };

export default async function ProjectSettingsPage(
  props: PageProps<"/w/[workspaceSlug]/projects/[projectId]/settings">,
) {
  const { workspaceSlug, projectId } = await props.params;
  const scope = await requireWorkspace(workspaceSlug);
  const project = await orNotFound(getProjectDetail(scope, projectId));
  const members = await listMembers(scope.workspace.id);
  const roleOf = new Map(project.team.map((t) => [t.userId, t.role]));
  const slug = scope.workspace.slug;

  return (
    <div className="grid gap-6">
      {project.can.manage && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Project details</CardTitle>
            <CardDescription>
              Name, objective and the status everyone sees on the project list.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProjectDetailsForm slug={slug} project={project} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Team</CardTitle>
          <CardDescription>
            Everyone in the workspace can see this project. Project managers can edit it and its
            milestones; reviewers can comment even with view-only workspace access.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="divide-y">
            {members.map((m) => {
              const role = roleOf.get(m.userId) ?? null;
              return (
                <li
                  key={m.userId}
                  className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <UserAvatar person={m} className="size-8 text-xs" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{m.name}</p>
                    <p className="text-muted-foreground truncate text-xs">
                      {ROLE_LABELS[m.role]} in workspace{m.jobTitle ? ` · ${m.jobTitle}` : ""}
                    </p>
                  </div>
                  {project.can.manage ? (
                    <ProjectRoleSelect
                      slug={slug}
                      projectId={project.id}
                      userId={m.userId}
                      role={role}
                    />
                  ) : (
                    <span className="text-muted-foreground text-xs">
                      {role ? PROJECT_ROLE_LABELS[role] : "—"}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      {project.can.manage && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Archive</CardTitle>
            <CardDescription>
              Hide a finished or abandoned project without deleting its history.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ArchiveProjectButton slug={slug} projectId={project.id} name={project.name} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
