"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { runAction, type ActionResult } from "@/lib/action";
import { actionScope } from "@/modules/workspaces/access";
import { archiveProject, createProject, setProjectRole, updateProject } from "@/modules/projects/service";

export async function createProjectAction(slug: string, values: unknown): Promise<ActionResult> {
  const result = await runAction(async () => createProject(await actionScope(slug), values));
  if (!result.ok) return result;
  redirect(`/w/${slug}/projects/${result.data.id}`);
}

export async function updateProjectAction(slug: string, projectId: string, values: unknown): Promise<ActionResult> {
  const result = await runAction(async () => updateProject(await actionScope(slug), projectId, values));
  if (result.ok) refresh();
  return result;
}

export async function archiveProjectAction(slug: string, projectId: string): Promise<ActionResult> {
  const result = await runAction(async () => archiveProject(await actionScope(slug), projectId));
  if (!result.ok) return result;
  redirect(`/w/${slug}/projects`);
}

export async function setProjectRoleAction(slug: string, projectId: string, values: unknown): Promise<ActionResult> {
  const result = await runAction(async () => setProjectRole(await actionScope(slug), projectId, values));
  if (result.ok) refresh();
  return result;
}
