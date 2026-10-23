import { Schema, model, models, type Model, type InferSchemaType } from "mongoose";

// Shared with GG-ops.
const workspaceSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, default: null },
    logoUrl: { type: String, default: null },
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  },
  { timestamps: true },
);

export type WorkspaceDoc = InferSchemaType<typeof workspaceSchema>;

export const Workspace: Model<WorkspaceDoc> =
  (models.Workspace as Model<WorkspaceDoc>) || model<WorkspaceDoc>("Workspace", workspaceSchema);
