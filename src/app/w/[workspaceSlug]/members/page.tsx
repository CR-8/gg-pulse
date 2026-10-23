import type { Metadata } from "next";
import { UserAvatar } from "@/components/data-display/people";
import { PageHeader } from "@/components/feedback/states";
import {
  InviteActions,
  InviteDialog,
  MemberRoleSelect,
  RemoveMemberButton,
} from "@/components/workspace/member-controls";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/dates";
import { allows, requireWorkspace } from "@/modules/workspaces/access";
import { ROLE_LABELS } from "@/modules/workspaces/roles";
import { listMembers, listPendingInvites } from "@/modules/workspaces/queries";

export const metadata: Metadata = { title: "Members" };

export default async function MembersPage(props: PageProps<"/w/[workspaceSlug]/members">) {
  const { workspaceSlug } = await props.params;
  const scope = await requireWorkspace(workspaceSlug);
  const canManage = allows(scope, "members.manage");
  const [members, invites] = await Promise.all([
    listMembers(scope.workspace.id),
    canManage ? listPendingInvites(scope) : Promise.resolve([]),
  ]);
  const slug = scope.workspace.slug;

  return (
    <>
      <PageHeader
        title="Members"
        description={`${members.length} ${members.length === 1 ? "person" : "people"} · your role: ${ROLE_LABELS[scope.role]}`}
        actions={canManage ? <InviteDialog slug={slug} /> : null}
      />

      <div className="bg-card overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-56">Person</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Joined</TableHead>
              {canManage && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((m) => {
              const editable = canManage && m.role !== "MAINTAINER" && m.userId !== scope.actor.id;
              return (
                <TableRow key={m.memberId}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <UserAvatar person={m} className="size-8 text-xs" />
                      <div className="min-w-0">
                        <p className="truncate font-medium">
                          {m.name}
                          {m.userId === scope.actor.id && (
                            <span className="text-muted-foreground font-normal"> (you)</span>
                          )}
                        </p>
                        <p className="text-muted-foreground truncate text-xs">
                          {m.email}
                          {m.jobTitle ? ` · ${m.jobTitle}` : ""}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {editable && m.role !== "MAINTAINER" ? (
                      <MemberRoleSelect slug={slug} memberId={m.memberId} role={m.role} />
                    ) : (
                      <span className="text-sm">{ROLE_LABELS[m.role]}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {m.joinedAt ? formatDate(m.joinedAt) : "—"}
                  </TableCell>
                  {canManage && (
                    <TableCell className="text-right">
                      {editable && (
                        <RemoveMemberButton slug={slug} memberId={m.memberId} name={m.name} />
                      )}
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {canManage && invites.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-2 text-sm font-semibold">
            Pending invites{" "}
            <span className="text-muted-foreground font-normal">{invites.length}</span>
          </h2>
          <div className="bg-card overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invites.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className="font-medium">{i.email}</TableCell>
                    <TableCell>{ROLE_LABELS[i.role]}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {formatDate(i.expiresAt)}
                    </TableCell>
                    <TableCell>
                      <InviteActions slug={slug} inviteId={i.id} url={i.url} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      )}
    </>
  );
}
