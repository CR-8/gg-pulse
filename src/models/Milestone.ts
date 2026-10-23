import { Schema, model, models, type Model, type InferSchemaType } from "mongoose";
import { MILESTONE_STATUSES } from "@/modules/milestones/constants";

// gg-pulse-owned. Progress is derived from tasks.milestoneId, never stored.
const milestoneSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true },
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: null },
    startDate: { type: Date, default: null },
    dueDate: { type: Date, default: null },
    status: { type: String, enum: [...MILESTONE_STATUSES], default: "PLANNED" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

milestoneSchema.index({ workspaceId: 1, projectId: 1, dueDate: 1 });

export type MilestoneDoc = InferSchemaType<typeof milestoneSchema>;

export const Milestone: Model<MilestoneDoc> =
  (models.Milestone as Model<MilestoneDoc>) || model<MilestoneDoc>("Milestone", milestoneSchema);
