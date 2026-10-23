import { z } from "zod";
import { dateInput } from "@/lib/dates";
import { MAX_ASSIGNEES, TASK_PRIORITIES, TASK_STATUSES } from "@/modules/tasks/constants";

const objectId = z.string().regex(/^[0-9a-f]{24}$/i, "Invalid reference.");

const fields = {
  title: z.string().trim().min(1, "Give the task a title.").max(200, "Use at most 200 characters."),
  description: z.string().trim().max(10_000, "Use at most 10,000 characters."),
  status: z.enum(TASK_STATUSES),
  priority: z.enum(TASK_PRIORITIES),
  assigneeIds: z.array(objectId).max(MAX_ASSIGNEES, `At most ${MAX_ASSIGNEES} assignees.`),
  dueDate: dateInput,
  estimateHours: z
    .number("Enter a number of hours.")
    .min(0, "Hours can't be negative.")
    .max(1000, "Use at most 1000 hours.")
    .nullable(),
  milestoneId: objectId.nullable(),
};

export const createTaskSchema = z.object({
  title: fields.title,
  description: fields.description.default(""),
  status: fields.status.default("TODO"),
  priority: fields.priority.default("MEDIUM"),
  assigneeIds: fields.assigneeIds.default([]),
  dueDate: fields.dueDate.default(null),
  estimateHours: fields.estimateHours.default(null),
  milestoneId: fields.milestoneId.default(null),
});

/** Every field optional and without defaults: absent means "leave unchanged". */
export const updateTaskSchema = z.object({
  title: fields.title.optional(),
  description: fields.description.optional(),
  status: fields.status.optional(),
  priority: fields.priority.optional(),
  assigneeIds: fields.assigneeIds.optional(),
  dueDate: fields.dueDate.optional(),
  estimateHours: fields.estimateHours.optional(),
  milestoneId: fields.milestoneId.optional(),
});

export const commentSchema = z.object({
  body: z.string().trim().min(1, "Write something first.").max(5000, "Use at most 5000 characters."),
});

export type CreateTaskInput = z.input<typeof createTaskSchema>;
export type UpdateTaskInput = z.input<typeof updateTaskSchema>;
