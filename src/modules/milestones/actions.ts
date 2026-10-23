"use server";

import { refresh } from "next/cache";
import { runAction, type ActionResult } from "@/lib/action";
import { actionScope } from "@/modules/workspaces/access";
import { createMilestone, updateMilestone } from "@/modules/milestones/service";

export async function createMilestoneAction(
  slug: string,
  projectId: string,
  values: unknown,
): Promise<ActionResult> {
  const result = await runAction(async () => {
    await createMilestone(await actionScope(slug), projectId, values);
  });
  if (result.ok) refresh();
  return result;
}

export async function updateMilestoneAction(
  slug: string,
  milestoneId: string,
  values: unknown,
): Promise<ActionResult> {
  const result = await runAction(async () =>
    updateMilestone(await actionScope(slug), milestoneId, values),
  );
  if (result.ok) refresh();
  return result;
}
