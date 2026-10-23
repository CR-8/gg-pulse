import { cache } from "react";
import { connectDB } from "@/lib/db";
import { appUrl } from "@/lib/email";
import { oid } from "@/lib/ids";
import { AuditEvent } from "@/models/AuditEvent";
import { User } from "@/models/User";
import { Workspace } from "@/models/Workspace";
import { WorkspaceInvite } from "@/models/WorkspaceInvite";
import { WorkspaceMember } from "@/models/WorkspaceMember";
import { assertCan, type WorkspaceScope } from "@/modules/workspaces/access";
import type { InviteRole, WorkspaceRole } from "@/modules/workspaces/roles";

export type WorkspaceSummary = { id: string; slug: string; name: string; role: WorkspaceRole };

export const listUserWorkspaces = cache(async (userId: string): Promise<WorkspaceSummary[]> => {
  await connectDB();
  const memberships = await WorkspaceMember.find({ userId: oid(userId), status: "ACTIVE" })
    .select("workspaceId role")
    .lean();
  if (!memberships.length) return [];
  const workspaces = await Workspace.find({ _id: { $in: memberships.map((m) => m.workspaceId) } })
    .select("name slug")
    .sort({ name: 1 })
    .lean();
  const roleOf = new Map(memberships.map((m) => [String(m.workspaceId), m.role as WorkspaceRole]));
  return workspaces.map((w) => ({
    id: String(w._id),
    slug: w.slug,
    name: w.name,
    role: roleOf.get(String(w._id)) ?? "GUEST",
  }));
});

export type PersonDTO = { userId: string; name: string; email: string; image: string | null };
export type MemberDTO = PersonDTO & {
  memberId: string;
  jobTitle: string | null;
  role: WorkspaceRole;
  joinedAt: string | null;
};

/** Active members, memoized per request: also the source for assignee pickers and name lookups. */
export const listMembers = cache(async (workspaceId: string): Promise<MemberDTO[]> => {
  await connectDB();
  const members = await WorkspaceMember.find({ workspaceId: oid(workspaceId), status: "ACTIVE" }).lean();
  const users = await User.find({ _id: { $in: members.map((m) => m.userId) } })
    .select("name email image jobTitle")
    .lean();
  const byId = new Map(users.map((u) => [String(u._id), u]));
  return members
    .map((m) => {
      const u = byId.get(String(m.userId));
      return {
        memberId: String(m._id),
        userId: String(m.userId),
        name: u?.name ?? "Unknown user",
        email: u?.email ?? "",
        image: u?.image ?? null,
        jobTitle: u?.jobTitle ?? null,
        role: m.role as WorkspaceRole,
        joinedAt: m.joinedAt?.toISOString() ?? null,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
});

export type InviteDTO = { id: string; email: string; role: InviteRole; expiresAt: string; url: string };

export async function listPendingInvites(scope: WorkspaceScope): Promise<InviteDTO[]> {
  assertCan(scope, "members.manage");
  await connectDB();
  const invites = await WorkspaceInvite.find({
    workspaceId: oid(scope.workspace.id),
    acceptedAt: null,
    expiresAt: { $gt: new Date() },
  })
    .sort({ createdAt: -1 })
    .lean();
  return invites.map((i) => ({
    id: String(i._id),
    email: i.email,
    role: i.role as InviteRole,
    expiresAt: i.expiresAt.toISOString(),
    url: appUrl(`/invite/${i.token}`),
  }));
}

export type InvitePreview = {
  workspaceName: string;
  email: string;
  role: InviteRole;
  status: "valid" | "expired" | "accepted";
};

export async function getInvitePreview(token: string): Promise<InvitePreview | null> {
  await connectDB();
  const invite = await WorkspaceInvite.findOne({ token }).lean();
  if (!invite) return null;
  const workspace = await Workspace.findById(invite.workspaceId).select("name").lean();
  if (!workspace) return null;
  return {
    workspaceName: workspace.name,
    email: invite.email,
    role: invite.role as InviteRole,
    status: invite.acceptedAt ? "accepted" : invite.expiresAt.getTime() <= Date.now() ? "expired" : "valid",
  };
}

export type AuditEventDTO = {
  id: string;
  action: string;
  actorName: string;
  targetType: string;
  targetId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export async function listAuditEvents(scope: WorkspaceScope, limit = 100): Promise<AuditEventDTO[]> {
  assertCan(scope, "audit.read");
  await connectDB();
  const events = await AuditEvent.find({ workspaceId: oid(scope.workspace.id) })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
  const actors = await User.find({ _id: { $in: events.map((e) => e.actorId) } }).select("name").lean();
  const nameOf = new Map(actors.map((u) => [String(u._id), u.name]));
  return events.map((e) => ({
    id: String(e._id),
    action: e.action,
    actorName: nameOf.get(String(e.actorId)) ?? "Unknown user",
    targetType: e.targetType,
    targetId: e.targetId ?? null,
    metadata: (e.metadata ?? {}) as Record<string, unknown>,
    createdAt: e.createdAt.toISOString(),
  }));
}
