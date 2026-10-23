import { Schema, model, models, type Model, type InferSchemaType } from "mongoose";
import { PROJECT_ROLES } from "@/modules/workspaces/roles";

// gg-pulse-owned. A project role only adds rights on one project on top of the workspace role.
const projectMembershipSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true },
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    role: { type: String, enum: [...PROJECT_ROLES], required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

projectMembershipSchema.index({ projectId: 1, userId: 1 }, { unique: true });
projectMembershipSchema.index({ workspaceId: 1, userId: 1 });

export type ProjectMembershipDoc = InferSchemaType<typeof projectMembershipSchema>;

export const ProjectMembership: Model<ProjectMembershipDoc> =
  (models.ProjectMembership as Model<ProjectMembershipDoc>) ||
  model<ProjectMembershipDoc>("ProjectMembership", projectMembershipSchema);
