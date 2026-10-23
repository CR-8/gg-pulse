import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { connectDB } from "@/lib/db";
import { sendMail } from "@/lib/email";
import { env } from "@/lib/env";
import { oid } from "@/lib/ids";
import { EmailVerification } from "@/models/EmailVerification";
import { User } from "@/models/User";

export const CODE_TTL_MINUTES = 15;
export const MAX_CODE_ATTEMPTS = 5;

export function generateCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

/** Keyed by AUTH_SECRET and bound to the user, so a leaked table row can't be brute-forced offline. */
export function hashCode(userId: string, code: string): string {
  return createHmac("sha256", env.AUTH_SECRET).update(`${userId}:${code}`).digest("hex");
}

export async function issueVerificationCode(userId: string, email: string): Promise<void> {
  await connectDB();
  const code = generateCode();
  await EmailVerification.findOneAndUpdate(
    { userId: oid(userId) },
    {
      codeHash: hashCode(userId, code),
      attempts: 0,
      expiresAt: new Date(Date.now() + CODE_TTL_MINUTES * 60_000),
    },
    { upsert: true },
  );
  await sendMail({
    to: email,
    subject: `${code} is your gg-pulse verification code`,
    text: `Your verification code is ${code}. It expires in ${CODE_TTL_MINUTES} minutes.\n\nIf you didn't create a gg-pulse account, ignore this email.`,
  });
}

export type VerifyResult = "verified" | "invalid" | "expired";

export async function verifyEmailCode(userId: string, code: string): Promise<VerifyResult> {
  await connectDB();
  const record = await EmailVerification.findOne({ userId: oid(userId) }).lean();
  if (!record || record.expiresAt.getTime() <= Date.now() || record.attempts >= MAX_CODE_ATTEMPTS) {
    return "expired";
  }
  const expected = Buffer.from(record.codeHash, "hex");
  const given = Buffer.from(hashCode(userId, code), "hex");
  if (!timingSafeEqual(expected, given)) {
    await EmailVerification.updateOne({ _id: record._id }, { $inc: { attempts: 1 } });
    return record.attempts + 1 >= MAX_CODE_ATTEMPTS ? "expired" : "invalid";
  }
  await User.updateOne({ _id: oid(userId) }, { $set: { emailVerifiedAt: new Date() } });
  await EmailVerification.deleteOne({ _id: record._id });
  return "verified";
}
