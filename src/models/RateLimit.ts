import { Schema, model, models, type Model } from "mongoose";

// gg-pulse-owned fixed-window counters; _id is "<key>:<window number>".
type RateLimitDoc = { _id: string; count: number; expiresAt: Date };

const rateLimitSchema = new Schema<RateLimitDoc>({
  _id: { type: String, required: true },
  count: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true },
});

rateLimitSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RateLimit: Model<RateLimitDoc> =
  (models.RateLimit as Model<RateLimitDoc>) || model<RateLimitDoc>("RateLimit", rateLimitSchema);
