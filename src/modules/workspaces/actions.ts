"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { runAction, type ActionResult } from "@/lib/action";
import { requireVerifiedUser } from "@/modules/auth/session";
import { actionScope } from "@/modules/workspaces/access";
import {
  acceptInvite,
  changeMemberRole,
  createInvite,
  createWorkspace,
  removeMember,
  renameWorkspace,
  revokeInvite,
} from "@/modules/workspaces/service";

// Thin adapters: the session decides who acts and in which workspace; services decide what is allowed.

export async function createWorkspaceAction(values: unknown): Promise<ActionResult> {
  const user = await requireVerifiedUser();
  const result = await runAction(() => createWorkspace(user, values));
  if (!result.ok) return result;
  redirect(`/w/${result.data.slug}`);
}

export async function renameWorkspaceAction(slug: string, values: unknown): Promise<ActionResult> {
  const result = await runAction(async () => renameWorkspace(await actionScope(slug), values));
  if (result.ok) refresh();
  return result;
}

export async function createInviteAction(
  slug: string,
  values: unknown,
): Promise<ActionResult<{ url: string; emailed: boolean }>> {
  const result = await runAction(async () => createInvite(await actionScope(slug), values));
  if (result.ok) refresh();
  return result;
}

export async function revokeInviteAction(slug: string, inviteId: string): Promise<ActionResult> {
  const result = await runAction(async () => revokeInvite(await actionScope(slug), inviteId));
  if (result.ok) refresh();
  return result;
}

export async function changeMemberRoleAction(slug: string, values: unknown): Promise<ActionResult> {
  const result = await runAction(async () => changeMemberRole(await actionScope(slug), values));
  if (result.ok) refresh();
  return result;
}

export async function removeMemberAction(slug: string, memberId: string): Promise<ActionResult> {
  const result = await runAction(async () => removeMember(await actionScope(slug), memberId));
  if (result.ok) refresh();
  return result;
}

export async function acceptInviteAction(token: string): Promise<ActionResult> {
  const user = await requireVerifiedUser();
  const result = await runAction(() => acceptInvite(user, token));
  if (!result.ok) return result;
  redirect(`/w/${result.data.slug}`);
}
