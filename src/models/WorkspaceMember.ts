import { Schema, model, models, type Model, type InferSchemaType } from "mongoose";
import { MEMBER_STATUSES, WORKSPACE_ROLES } from "@/modules/workspaces/roles";

// Shared with GG-ops. Membership is the tenant boundary.
const workspaceMemberSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    role: { type: String, enum: [...WORKSPACE_ROLES], default: "MEMBER" },
    status: { type: String, enum: [...MEMBER_STATUSES], default: "ACTIVE" },
    invitedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    joinedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

workspaceMemberSchema.index({ workspaceId: 1, userId: 1 }, { unique: true });
workspaceMemberSchema.index({ workspaceId: 1, role: 1 });

export type WorkspaceMemberDoc = InferSchemaType<typeof workspaceMemberSchema>;

export const WorkspaceMember: Model<WorkspaceMemberDoc> =
  (models.WorkspaceMember as Model<WorkspaceMemberDoc>) ||
  model<WorkspaceMemberDoc>("WorkspaceMember", workspaceMemberSchema);
