import { connectDB } from "@/lib/db";
import { ServiceError } from "@/lib/errors";
import { RateLimit } from "@/models/RateLimit";

/**
 * Fixed-window counter in MongoDB, so it holds across serverless instances without Redis.
 * ponytail: fixed window allows up to 2x the limit across a window edge; move to Redis
 * sliding windows when the worker stack brings Redis.
 */
export async function hit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  await connectDB();
  const windowNumber = Math.floor(Date.now() / (windowSeconds * 1000));
  const doc = await RateLimit.findOneAndUpdate(
    { _id: `${key}:${windowNumber}` },
    {
      $inc: { count: 1 },
      $setOnInsert: { expiresAt: new Date((windowNumber + 1) * windowSeconds * 1000) },
    },
    { upsert: true, new: true },
  ).lean();
  return (doc?.count ?? 0) <= limit;
}

export async function enforceRateLimit(key: string, limit: number, windowSeconds: number) {
  if (!(await hit(key, limit, windowSeconds))) {
    throw new ServiceError(
      "RATE_LIMITED",
      "Too many attempts. Please wait a few minutes and try again.",
    );
  }
}
