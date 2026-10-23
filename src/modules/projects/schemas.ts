import { z } from "zod";
import { PROJECT_STATUS_COLORS } from "@/modules/projects/constants";
import { PROJECT_ROLES } from "@/modules/workspaces/roles";

const name = z.string().trim().min(2, "Use at least 2 characters.").max(80, "Use at most 80 characters.");
const description = z.string().trim().max(2000, "Use at most 2000 characters.");

export const createProjectSchema = z.object({
  name,
  description: description.optional().default(""),
});

export const updateProjectSchema = z.object({
  name: name.optional(),
  description: description.optional(),
  statusColor: z.enum(PROJECT_STATUS_COLORS).nullable().optional(),
  statusNote: z.string().trim().max(500).optional(),
});

export const projectRoleSchema = z.object({
  userId: z.string(),
  role: z.enum(PROJECT_ROLES).nullable(),
});
