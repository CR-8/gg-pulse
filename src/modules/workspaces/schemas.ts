import { z } from "zod";
import { emailSchema } from "@/modules/auth/schemas";
import { INVITE_ROLES } from "@/modules/workspaces/roles";

export const workspaceNameSchema = z.object({
  name: z.string().trim().min(2, "Use at least 2 characters.").max(60, "Use at most 60 characters."),
});

export const inviteSchema = z.object({
  email: emailSchema,
  role: z.enum(INVITE_ROLES),
});

export const memberRoleSchema = z.object({
  memberId: z.string(),
  role: z.enum(INVITE_ROLES),
});
