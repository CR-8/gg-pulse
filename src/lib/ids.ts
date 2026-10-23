import { Types } from "mongoose";

const OBJECT_ID = /^[0-9a-f]{24}$/i;

/** Strict 24-hex check (Mongoose's own isValid also accepts any 12-char string). */
export function isObjectId(value: unknown): value is string {
  return typeof value === "string" && OBJECT_ID.test(value);
}

/** Parses an untrusted id; returns null instead of throwing so callers can answer 404. */
export function toObjectId(value: unknown): Types.ObjectId | null {
  return isObjectId(value) ? new Types.ObjectId(value) : null;
}

export const oid = (value: string) => new Types.ObjectId(value);
