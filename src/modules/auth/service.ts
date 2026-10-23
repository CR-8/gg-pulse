import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import { ServiceError } from "@/lib/errors";
import { oid } from "@/lib/ids";
import { hit, enforceRateLimit } from "@/lib/rate-limit";
import { User } from "@/models/User";
import { profileSchema, signInSchema, signUpSchema } from "@/modules/auth/schemas";
import { issueVerificationCode } from "@/modules/auth/verification";

// Compared against when the email is unknown, so response time doesn't reveal which emails exist.
let dummyHash: Promise<string> | undefined;
const getDummyHash = () => (dummyHash ??= bcrypt.hash("no-account-has-this-password", 10));

export type CredentialUser = {
  id: string;
  name: string;
  email: string;
  image?: string;
  authVersion: number;
};

export async function verifyCredentials(raw: unknown): Promise<CredentialUser | null> {
  const parsed = signInSchema.safeParse(raw);
  if (!parsed.success) return null;
  const { email, password } = parsed.data;
  if (!(await hit(`signin:${email}`, 10, 15 * 60))) return null;

  await connectDB();
  const user = await User.findOne({ email })
    .select("name email image passwordHash isActive authVersion")
    .lean();
  const valid = await bcrypt.compare(password, user?.passwordHash ?? (await getDummyHash()));
  if (!user || !user.passwordHash || !valid || !user.isActive) return null;
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    image: user.image ?? undefined,
    authVersion: user.authVersion ?? 0,
  };
}

/** Creates an unverified credentials account and emails it a code. Same document shape as GG-ops sign-up. */
export async function signUp(input: unknown): Promise<{ userId: string }> {
  const { email, password } = signUpSchema.parse(input);
  await enforceRateLimit(`signup:${email}`, 5, 60 * 60);
  await connectDB();
  if (await User.exists({ email })) {
    throw new ServiceError(
      "CONFLICT",
      "An account with this email already exists. Sign in instead.",
    );
  }
  const user = await User.create({
    // Placeholder until onboarding asks for the real name.
    name: email.split("@")[0] ?? email,
    email,
    passwordHash: await bcrypt.hash(password, 10),
    emailVerifiedAt: null,
    authVersion: 0,
    isActive: true,
  });
  await issueVerificationCode(String(user._id), email);
  return { userId: String(user._id) };
}

export async function resendVerificationCode(userId: string, email: string): Promise<void> {
  await enforceRateLimit(`verify-resend:${userId}`, 3, 15 * 60);
  await issueVerificationCode(userId, email);
}

export async function updateProfile(userId: string, input: unknown): Promise<void> {
  const { name, jobTitle } = profileSchema.parse(input);
  await connectDB();
  await User.updateOne({ _id: oid(userId) }, { $set: { name, jobTitle: jobTitle || null } });
}

type OAuthProfile = { email: string; name?: string | null; image?: string | null };

/**
 * Finds or creates the account for a verified OAuth email (GG-ops links Google the same way).
 * Returns null for deactivated accounts so sign-in is refused.
 */
export async function upsertOAuthUser(
  profile: OAuthProfile,
): Promise<{ id: string; authVersion: number } | null> {
  await connectDB();
  const email = profile.email.toLowerCase();
  const existing = await User.findOne({ email })
    .select("_id authVersion isActive emailVerifiedAt")
    .lean();
  if (existing) {
    if (!existing.isActive) return null;
    if (existing.emailVerifiedAt === null) {
      // An unverified password account with this email may have been registered by someone
      // else (account pre-hijacking). The provider just proved who owns the address: drop the
      // unproven password and end any sessions it opened.
      const authVersion = (existing.authVersion ?? 0) + 1;
      await User.updateOne(
        { _id: existing._id },
        { $set: { emailVerifiedAt: new Date(), passwordHash: null, authVersion } },
      );
      return { id: String(existing._id), authVersion };
    }
    return { id: String(existing._id), authVersion: existing.authVersion ?? 0 };
  }
  const created = await User.create({
    name: profile.name || email.split("@")[0] || email,
    email,
    image: profile.image ?? null,
    emailVerifiedAt: new Date(),
    authVersion: 0,
    isActive: true,
  });
  return { id: String(created._id), authVersion: 0 };
}

export async function sessionClaimsFor(
  email: string,
): Promise<{ id: string; authVersion: number } | null> {
  await connectDB();
  const user = await User.findOne({ email: email.toLowerCase(), isActive: true })
    .select("_id authVersion")
    .lean();
  return user ? { id: String(user._id), authVersion: user.authVersion ?? 0 } : null;
}

/** GitHub can return an unverified primary email; only verified addresses may sign in or link. */
export async function isVerifiedGitHubEmail(accessToken: string, email: string): Promise<boolean> {
  const res = await fetch("https://api.github.com/user/emails", {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/vnd.github+json" },
  });
  if (!res.ok) return false;
  const emails = (await res.json()) as { email: string; verified: boolean }[];
  return emails.some((e) => e.verified && e.email.toLowerCase() === email.toLowerCase());
}
