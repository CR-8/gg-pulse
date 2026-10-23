import { Schema, model, models, type Model, type InferSchemaType } from "mongoose";

// gg-pulse-owned: one live 6-digit code per user, removed by TTL when it expires.
const emailVerificationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    codeHash: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

emailVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type EmailVerificationDoc = InferSchemaType<typeof emailVerificationSchema>;

export const EmailVerification: Model<EmailVerificationDoc> =
  (models.EmailVerification as Model<EmailVerificationDoc>) ||
  model<EmailVerificationDoc>("EmailVerification", emailVerificationSchema);
