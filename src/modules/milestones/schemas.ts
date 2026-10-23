import { z } from "zod";
import { dateInput } from "@/lib/dates";
import { MILESTONE_STATUSES } from "@/modules/milestones/constants";

const fields = {
  name: z.string().trim().min(2, "Use at least 2 characters.").max(80, "Use at most 80 characters."),
  description: z.string().trim().max(2000),
  startDate: dateInput,
  dueDate: dateInput,
  status: z.enum(MILESTONE_STATUSES),
};

export const createMilestoneSchema = z
  .object({
    name: fields.name,
    description: fields.description.default(""),
    // Zod 4 defaults are output values, so a missing date defaults straight to null.
    startDate: fields.startDate.default(null),
    dueDate: fields.dueDate.default(null),
  })
  .refine((m) => !m.startDate || !m.dueDate || m.startDate <= m.dueDate, {
    message: "The start date must be on or before the due date.",
    path: ["dueDate"],
  });

export const updateMilestoneSchema = z.object({
  name: fields.name.optional(),
  description: fields.description.optional(),
  startDate: fields.startDate.optional(),
  dueDate: fields.dueDate.optional(),
  status: fields.status.optional(),
});
