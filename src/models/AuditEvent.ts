import { Schema, model, models, type Model, type InferSchemaType } from "mongoose";

const RETENTION_SECONDS = 730 * 24 * 60 * 60;

// gg-pulse-owned security audit trail (activitylogs is the product timeline).
const auditEventSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", default: null },
    actorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    action: { type: String, required: true },
    targetType: { type: String, required: true },
    targetId: { type: String, default: null },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

auditEventSchema.index({ workspaceId: 1, createdAt: -1 });
auditEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: RETENTION_SECONDS });

export type AuditEventDoc = InferSchemaType<typeof auditEventSchema>;

export const AuditEvent: Model<AuditEventDoc> =
  (models.AuditEvent as Model<AuditEventDoc>) || model<AuditEventDoc>("AuditEvent", auditEventSchema);
