import { Schema, model, models, type Model, type InferSchemaType } from "mongoose";
import { TASK_PRIORITIES, TASK_STATUSES, TASK_TYPES } from "@/modules/tasks/constants";

// Shared with GG-ops: identical fields and indexes, plus two additive gg-pulse extension
// fields at the bottom. Never add indexes here: GG-ops's syncIndexes() would drop them.
const taskSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true },
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    sectionId: { type: Schema.Types.ObjectId, ref: "Section", default: null },
    parentTaskId: { type: Schema.Types.ObjectId, ref: "Task", default: null },

    title: { type: String, required: true, trim: true },
    description: { type: String, default: null },

    status: { type: String, enum: [...TASK_STATUSES], default: "TODO" },
    priority: { type: String, enum: [...TASK_PRIORITIES], default: "MEDIUM" },
    type: { type: String, enum: [...TASK_TYPES], default: "TASK" },

    assigneeIds: [{ type: Schema.Types.ObjectId, ref: "User" }],
    labelIds: [{ type: Schema.Types.ObjectId, ref: "Label" }],

    dueDate: { type: Date, default: null },
    startDate: { type: Date, default: null },
    completedAt: { type: Date, default: null },

    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },

    isArchived: { type: Boolean, default: false },
    position: { type: Number, default: 0 },

    recurrenceRule: { type: String, enum: ["DAILY", "WEEKLY", "MONTHLY", "YEARLY"], default: null },
    recurrenceParentId: { type: Schema.Types.ObjectId, ref: "Task", default: null },

    // gg-pulse extension fields (nullable, ignored by GG-ops).
    milestoneId: { type: Schema.Types.ObjectId, ref: "Milestone", default: null },
    estimateHours: { type: Number, default: null, min: 0, max: 1000 },
  },
  { timestamps: true },
);

taskSchema.index({ projectId: 1, sectionId: 1, position: 1 });
taskSchema.index({ workspaceId: 1, assigneeIds: 1, dueDate: 1 });
taskSchema.index({ workspaceId: 1, projectId: 1, isArchived: 1 });
taskSchema.index({ parentTaskId: 1 });
taskSchema.index(
  { workspaceId: 1, title: "text", description: "text" },
  { weights: { title: 10, description: 1 } },
);
taskSchema.index({ workspaceId: 1, recurrenceRule: 1 });
taskSchema.index({ workspaceId: 1, assigneeIds: 1, isArchived: 1, dueDate: 1, updatedAt: -1 });
taskSchema.index({ workspaceId: 1, isArchived: 1, status: 1, dueDate: 1, projectId: 1 });

export type TaskDoc = InferSchemaType<typeof taskSchema>;

export const Task: Model<TaskDoc> = (models.Task as Model<TaskDoc>) || model<TaskDoc>("Task", taskSchema);
