import { cache } from "react";
import { notFound } from "next/navigation";
import { connectDB } from "@/lib/db";
import { forbiddenError, notFoundError } from "@/lib/errors";
import { oid } from "@/lib/ids";
import { Workspace } from "@/models/Workspace";
import { WorkspaceMember } from "@/models/WorkspaceMember";
import { requireVerifiedUser } from "@/modules/auth/session";
import { can, type Capability } from "@/modules/workspaces/policy";
import type { ProjectRole, WorkspaceRole } from "@/modules/workspaces/roles";

export type Actor = { id: string; name: string; email: string };

/**
 * An authorized tenant context. Services accept only this, never a raw workspace id from
 * the client, so every read and write is bound to a workspace the actor is an ACTIVE member of.
 */
export type WorkspaceScope = {
  workspace: { id: string; slug: string; name: string };
  role: WorkspaceRole;
  actor: Actor;
};

export async function resolveWorkspaceScope(actor: Actor, slug: string): Promise<WorkspaceScope | null> {
  await connectDB();
  const workspace = await Workspace.findOne({ slug: slug.toLowerCase() }).select("name slug").lean();
  if (!workspace) return null;
  const membership = await WorkspaceMember.findOne({
    workspaceId: workspace._id,
    userId: oid(actor.id),
    status: "ACTIVE",
  })
    .select("role")
    .lean();
  if (!membership) return null;
  return {
    workspace: { id: String(workspace._id), slug: workspace.slug, name: workspace.name },
    role: membership.role as WorkspaceRole,
    actor: { id: actor.id, name: actor.name, email: actor.email },
  };
}

/** For pages and layouts: non-members get a 404, which does not reveal that the workspace exists. */
export const requireWorkspace = cache(async (slug: string): Promise<WorkspaceScope> => {
  const user = await requireVerifiedUser();
  const scope = await resolveWorkspaceScope(user, slug);
  if (!scope) notFound();
  return scope;
});

/** For Server Actions: the same check, surfaced as an error message instead of a page. */
export async function actionScope(slug: string): Promise<WorkspaceScope> {
  const user = await requireVerifiedUser();
  const scope = await resolveWorkspaceScope(user, slug);
  if (!scope) throw notFoundError("Workspace");
  return scope;
}

export function assertCan(scope: WorkspaceScope, capability: Capability, projectRole?: ProjectRole | null) {
  if (!can(capability, { workspaceRole: scope.role, projectRole })) throw forbiddenError();
}

export function allows(scope: WorkspaceScope, capability: Capability, projectRole?: ProjectRole | null) {
  return can(capability, { workspaceRole: scope.role, projectRole });
}
