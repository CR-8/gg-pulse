import { randomBytes } from "node:crypto";
import { connectDB } from "@/lib/db";
import { appUrl, sendMail } from "@/lib/email";
import { ServiceError, notFoundError } from "@/lib/errors";
import { oid, toObjectId } from "@/lib/ids";
import { errorMessage, logger } from "@/lib/logger";
import { slugify } from "@/lib/utils";
import { ProjectMembership } from "@/models/ProjectMembership";
import { User } from "@/models/User";
import { Workspace } from "@/models/Workspace";
import { WorkspaceInvite } from "@/models/WorkspaceInvite";
import { WorkspaceMember } from "@/models/WorkspaceMember";
import { recordAudit } from "@/modules/audit/record";
import { assertCan, type Actor, type WorkspaceScope } from "@/modules/workspaces/access";
import { ROLE_LABELS } from "@/modules/workspaces/roles";
import { inviteSchema, memberRoleSchema, workspaceNameSchema } from "@/modules/workspaces/schemas";

// Not a "use server" module: callers pass an already-authorized actor or scope.

const INVITE_DAYS = 7;
const RESERVED_SLUGS = new Set(["new", "settings", "api", "admin"]);

async function uniqueSlug(name: string): Promise<string> {
  const base = slugify(name).slice(0, 40) || "workspace";
  let slug = RESERVED_SLUGS.has(base) ? `${base}-1` : base;
  for (let n = 1; await Workspace.exists({ slug }); n++) slug = `${base}-${n}`;
  return slug;
}

/**
 * Creates the workspace and the creator's owner membership. No transaction (the local
 * MongoDB is standalone): if the membership insert fails the workspace is removed again.
 */
export async function createWorkspace(actor: Actor, input: unknown): Promise<{ slug: string }> {
  const { name } = workspaceNameSchema.parse(input);
  await connectDB();
  const ownerId = oid(actor.id);
  const workspace = await Workspace.create({ name, slug: await uniqueSlug(name), ownerId });
  try {
    await WorkspaceMember.create({
      workspaceId: workspace._id,
      userId: ownerId,
      role: "MAINTAINER",
      status: "ACTIVE",
      joinedAt: new Date(),
    });
  } catch (error) {
    await Workspace.deleteOne({ _id: workspace._id });
    throw error;
  }
  await recordAudit({
    workspaceId: String(workspace._id),
    actorId: actor.id,
    action: "workspace.created",
    targetType: "workspace",
    targetId: String(workspace._id),
    metadata: { name },
  });
  return { slug: workspace.slug };
}

export async function renameWorkspace(scope: WorkspaceScope, input: unknown): Promise<void> {
  assertCan(scope, "workspace.update");
  const { name } = workspaceNameSchema.parse(input);
  await connectDB();
  await Workspace.updateOne({ _id: oid(scope.workspace.id) }, { $set: { name } });
  await recordAudit({
    workspaceId: scope.workspace.id,
    actorId: scope.actor.id,
    action: "workspace.renamed",
    targetType: "workspace",
    targetId: scope.workspace.id,
    metadata: { from: scope.workspace.name, to: name },
  });
}

export async function createInvite(scope: WorkspaceScope, input: unknown): Promise<{ url: string; emailed: boolean }> {
  assertCan(scope, "members.manage");
  const { email, role } = inviteSchema.parse(input);
  await connectDB();
  const workspaceId = oid(scope.workspace.id);

  const existingUser = await User.findOne({ email }).select("_id").lean();
  if (existingUser) {
    const active = await WorkspaceMember.exists({ workspaceId, userId: existingUser._id, status: "ACTIVE" });
    if (active) throw new ServiceError("CONFLICT", `${email} is already a member of this workspace.`);
  }

  // One live invite per email: a new invite replaces older pending ones.
  await WorkspaceInvite.deleteMany({ workspaceId, email, acceptedAt: null });
  const token = randomBytes(32).toString("base64url");
  await WorkspaceInvite.create({
    workspaceId,
    email,
    role,
    invitedBy: oid(scope.actor.id),
    token,
    expiresAt: new Date(Date.now() + INVITE_DAYS * 24 * 60 * 60 * 1000),
  });
  await recordAudit({
    workspaceId: scope.workspace.id,
    actorId: scope.actor.id,
    action: "invite.created",
    targetType: "invite",
    targetId: email,
    metadata: { role },
  });

  const url = appUrl(`/invite/${token}`);
  let emailed = true;
  try {
    await sendMail({
      to: email,
      subject: `${scope.actor.name} invited you to ${scope.workspace.name} on gg-pulse`,
      text: `${scope.actor.name} invited you to join ${scope.workspace.name} as ${ROLE_LABELS[role]}.\n\nAccept: ${url}\n\nThe link expires in ${INVITE_DAYS} days.`,
    });
  } catch (error) {
    // The link is still shown to the inviter, so a mail outage doesn't block inviting.
    emailed = false;
    logger.warn("Invite email failed", { error: errorMessage(error) });
  }
  return { url, emailed };
}

export async function revokeInvite(scope: WorkspaceScope, inviteId: string): Promise<void> {
  assertCan(scope, "members.manage");
  const id = toObjectId(inviteId);
  if (!id) throw notFoundError("Invite");
  await connectDB();
  const invite = await WorkspaceInvite.findOneAndDelete({
    _id: id,
    workspaceId: oid(scope.workspace.id),
    acceptedAt: null,
  }).lean();
  if (!invite) throw notFoundError("Invite");
  await recordAudit({
    workspaceId: scope.workspace.id,
    actorId: scope.actor.id,
    action: "invite.revoked",
    targetType: "invite",
    targetId: invite.email,
  });
}

/** Invites are bound to the invited address: only that account can accept. */
export async function acceptInvite(actor: Actor, token: string): Promise<{ slug: string }> {
  await connectDB();
  const invite = await WorkspaceInvite.findOne({ token }).lean();
  if (!invite || invite.acceptedAt || invite.expiresAt.getTime() <= Date.now()) {
    throw new ServiceError("NOT_FOUND", "This invite link is invalid or has expired.");
  }
  if (invite.email !== actor.email.toLowerCase()) {
    throw new ServiceError("FORBIDDEN", `This invite was sent to ${invite.email}. Sign in with that account to accept it.`);
  }
  const workspace = await Workspace.findById(invite.workspaceId).select("slug").lean();
  if (!workspace) throw notFoundError("Workspace");

  const userId = oid(actor.id);
  const existing = await WorkspaceMember.findOne({ workspaceId: invite.workspaceId, userId }).lean();
  if (!existing) {
    await WorkspaceMember.create({
      workspaceId: invite.workspaceId,
      userId,
      role: invite.role,
      status: "ACTIVE",
      invitedBy: invite.invitedBy,
      joinedAt: new Date(),
    });
  } else if (existing.status !== "ACTIVE") {
    await WorkspaceMember.updateOne(
      { _id: existing._id },
      { $set: { status: "ACTIVE", role: invite.role, invitedBy: invite.invitedBy, joinedAt: new Date() } },
    );
  }
  await WorkspaceInvite.updateOne({ _id: invite._id }, { $set: { acceptedAt: new Date() } });
  await recordAudit({
    workspaceId: String(invite.workspaceId),
    actorId: actor.id,
    action: "invite.accepted",
    targetType: "member",
    targetId: actor.id,
    metadata: { role: invite.role },
  });
  return { slug: workspace.slug };
}

async function loadOtherMember(scope: WorkspaceScope, memberId: string) {
  const id = toObjectId(memberId);
  if (!id) throw notFoundError("Member");
  await connectDB();
  const member = await WorkspaceMember.findOne({
    _id: id,
    workspaceId: oid(scope.workspace.id),
    status: "ACTIVE",
  }).lean();
  if (!member) throw notFoundError("Member");
  if (String(member.userId) === scope.actor.id) {
    throw new ServiceError("INVALID", "You can't change your own membership.");
  }
  if (member.role === "MAINTAINER") {
    throw new ServiceError("FORBIDDEN", "The workspace owner can't be changed or removed.");
  }
  return member;
}

export async function changeMemberRole(scope: WorkspaceScope, input: unknown): Promise<void> {
  assertCan(scope, "members.manage");
  const { memberId, role } = memberRoleSchema.parse(input);
  const member = await loadOtherMember(scope, memberId);
  if (member.role === role) return;
  await WorkspaceMember.updateOne({ _id: member._id }, { $set: { role } });
  await recordAudit({
    workspaceId: scope.workspace.id,
    actorId: scope.actor.id,
    action: "member.role_changed",
    targetType: "member",
    targetId: String(member.userId),
    metadata: { from: member.role, to: role },
  });
}

export async function removeMember(scope: WorkspaceScope, memberId: string): Promise<void> {
  assertCan(scope, "members.manage");
  const member = await loadOtherMember(scope, memberId);
  await WorkspaceMember.updateOne({ _id: member._id }, { $set: { status: "REMOVED" } });
  await ProjectMembership.deleteMany({ workspaceId: oid(scope.workspace.id), userId: member.userId });
  await recordAudit({
    workspaceId: scope.workspace.id,
    actorId: scope.actor.id,
    action: "member.removed",
    targetType: "member",
    targetId: String(member.userId),
    metadata: { role: member.role },
  });
}
