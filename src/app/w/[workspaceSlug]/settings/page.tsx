import type { Metadata } from "next";
import { PageHeader } from "@/components/feedback/states";
import { ProfileForm, WorkspaceNameForm } from "@/components/workspace/settings-forms";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime } from "@/lib/dates";
import { requireVerifiedUser } from "@/modules/auth/session";
import { allows, requireWorkspace } from "@/modules/workspaces/access";
import { listAuditEvents } from "@/modules/workspaces/queries";

export const metadata: Metadata = { title: "Settings" };

const AUDIT_LABELS: Record<string, string> = {
  "workspace.created": "Created the workspace",
  "workspace.renamed": "Renamed the workspace",
  "invite.created": "Invited",
  "invite.revoked": "Revoked the invite for",
  "invite.accepted": "Joined via invite",
  "member.role_changed": "Changed the role of a member",
  "member.removed": "Removed a member",
  "project.archived": "Archived a project",
  "project.role_changed": "Changed a project role",
};

function auditDetail(e: {
  action: string;
  targetId: string | null;
  metadata: Record<string, unknown>;
}): string {
  const m = e.metadata;
  if (e.action.startsWith("invite.") && e.action !== "invite.accepted") return e.targetId ?? "";
  if (m.from !== undefined && m.to !== undefined) return `${String(m.from)} → ${String(m.to)}`;
  if (typeof m.name === "string") return m.name;
  if (typeof m.role === "string") return m.role;
  return "";
}

export default async function SettingsPage(props: PageProps<"/w/[workspaceSlug]/settings">) {
  const { workspaceSlug } = await props.params;
  const scope = await requireWorkspace(workspaceSlug);
  const user = await requireVerifiedUser();
  const canManage = allows(scope, "workspace.update");
  const audit = allows(scope, "audit.read") ? await listAuditEvents(scope, 50) : null;

  return (
    <>
      <PageHeader title="Settings" />
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your profile</CardTitle>
            <CardDescription>
              Shown to teammates in every workspace you belong to (and in GG-ops).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProfileForm name={user.name} jobTitle={user.jobTitle ?? ""} />
          </CardContent>
        </Card>

        {canManage && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Workspace</CardTitle>
            </CardHeader>
            <CardContent>
              <WorkspaceNameForm slug={scope.workspace.slug} name={scope.workspace.name} />
            </CardContent>
          </Card>
        )}

        {audit && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Audit log</CardTitle>
              <CardDescription>
                Membership, permission and project changes in the last two years (most recent 50).
              </CardDescription>
            </CardHeader>
            <CardContent>
              {audit.length === 0 ? (
                <p className="text-muted-foreground text-sm">Nothing recorded yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>When</TableHead>
                        <TableHead>Who</TableHead>
                        <TableHead>What</TableHead>
                        <TableHead>Detail</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {audit.map((e) => (
                        <TableRow key={e.id}>
                          <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                            {formatDateTime(e.createdAt)}
                          </TableCell>
                          <TableCell className="text-sm">{e.actorName}</TableCell>
                          <TableCell className="text-sm">
                            {AUDIT_LABELS[e.action] ?? e.action}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs">
                            {auditDetail(e)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
