import mongoose from "mongoose";
import { env } from "@/lib/env";

type Cache = { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };

// Survives HMR in dev and is reused across warm serverless invocations.
const globalCache = globalThis as unknown as { _mongoose?: Cache };
const cache: Cache = globalCache._mongoose ?? (globalCache._mongoose = { conn: null, promise: null });

/** The only way to reach MongoDB. */
export async function connectDB(): Promise<typeof mongoose> {
  if (cache.conn) return cache.conn;
  cache.promise ??= mongoose.connect(env.MONGODB_URI, {
    bufferCommands: false,
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 10_000,
    // Production builds indexes with `npm run db:indexes` (createIndexes only, never
    // syncIndexes: shared GG-ops collections carry indexes gg-pulse must not drop).
    autoIndex: env.NODE_ENV !== "production",
  });
  try {
    cache.conn = await cache.promise;
  } catch (error) {
    cache.promise = null;
    throw error;
  }
  return cache.conn;
}
