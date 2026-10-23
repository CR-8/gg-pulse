import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { toObjectId } from "@/lib/ids";
import { User } from "@/models/User";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  jobTitle: string | null;
  emailVerified: boolean;
};

/**
 * Loads the account behind a session and re-checks it on every request: deactivated
 * accounts and sessions older than the account's `authVersion` (bumped by password
 * changes or "sign out everywhere", in either app) are rejected.
 */
export async function loadActiveUser(userId: string, authVersion: number): Promise<SessionUser | null> {
  const id = toObjectId(userId);
  if (!id) return null;
  await connectDB();
  const user = await User.findById(id)
    .select("name email image jobTitle isActive authVersion emailVerifiedAt")
    .lean();
  if (!user?.isActive || (user.authVersion ?? 0) !== authVersion) return null;
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    image: user.image ?? null,
    jobTitle: user.jobTitle ?? null,
    // GG-ops semantics: absent = legacy (verified), null = unverified, Date = verified.
    emailVerified: user.emailVerifiedAt !== null,
  };
}

/** The data-access entry point: memoized per request, null when signed out. */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const session = await auth();
  if (!session?.user?.id) return null;
  return loadActiveUser(session.user.id, session.user.authVersion ?? 0);
});

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  return user;
}

export async function requireVerifiedUser(): Promise<SessionUser> {
  const user = await requireUser();
  if (!user.emailVerified) redirect("/verify-email");
  return user;
}
