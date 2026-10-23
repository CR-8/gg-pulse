"use server";

import { refresh } from "next/cache";
import { runAction, type ActionResult } from "@/lib/action";
import { actionScope } from "@/modules/workspaces/access";
import { addComment, createTask, updateTask } from "@/modules/tasks/service";

export async function createTaskAction(
  slug: string,
  projectId: string,
  values: unknown,
): Promise<ActionResult<{ id: string }>> {
  const result = await runAction(async () => createTask(await actionScope(slug), projectId, values));
  if (result.ok) refresh();
  return result;
}

export async function updateTaskAction(slug: string, taskId: string, values: unknown): Promise<ActionResult> {
  const result = await runAction(async () => updateTask(await actionScope(slug), taskId, values));
  if (result.ok) refresh();
  return result;
}

export async function addCommentAction(slug: string, taskId: string, values: unknown): Promise<ActionResult> {
  const result = await runAction(async () => {
    await addComment(await actionScope(slug), taskId, values);
  });
  if (result.ok) refresh();
  return result;
}
