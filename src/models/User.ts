import { Schema, model, models, type Model, type InferSchemaType } from "mongoose";

// Shared with GG-ops: same fields, defaults and indexes (docs/INTEGRATION-GG-OPS.md).
const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    image: { type: String, default: null },
    passwordHash: { type: String, default: null },
    // absent = legacy account (treated as verified), null = unverified, Date = verified.
    emailVerifiedAt: { type: Date, default: undefined },
    authVersion: { type: Number, default: 0 },
    lastPasswordChangedAt: { type: Date, default: null },
    timezone: { type: String, default: null },
    jobTitle: { type: String, default: null },
    department: { type: String, default: null },
    bio: { type: String, default: null },
    pronounceUrl: { type: String, default: null },
    outOfOfficeEnabled: { type: Boolean, default: false },
    outOfOfficeFrom: { type: Date, default: null },
    outOfOfficeUntil: { type: Date, default: null },
    outOfOfficeMessage: { type: String, default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export type UserDoc = InferSchemaType<typeof userSchema>;

export const User: Model<UserDoc> = (models.User as Model<UserDoc>) || model<UserDoc>("User", userSchema);
