"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { runAction, type ActionResult } from "@/lib/action";
import { signIn, signOut } from "@/lib/auth";
import { enabledOAuthProviders, type OAuthProviderId } from "@/modules/auth/auth.config";
import { profileSchema, safeNext, signInSchema, signUpSchema, verifyCodeSchema } from "@/modules/auth/schemas";
import { resendVerificationCode, signUp, updateProfile } from "@/modules/auth/service";
import { requireUser, requireVerifiedUser } from "@/modules/auth/session";
import { verifyEmailCode } from "@/modules/auth/verification";
import { createWorkspace } from "@/modules/workspaces/service";
import { workspaceNameSchema } from "@/modules/workspaces/schemas";

const withNext = (path: string, next: string) => (next === "/" ? path : `${path}?next=${encodeURIComponent(next)}`);

export async function signUpAction(values: unknown, next?: string): Promise<ActionResult> {
  const result = await runAction(() => signUp(values));
  if (!result.ok) return result;
  const { email, password } = signUpSchema.parse(values);
  // Throws the redirect on success.
  await signIn("credentials", { email, password, redirectTo: withNext("/verify-email", safeNext(next)) });
  return { ok: true, data: undefined };
}

export async function signInAction(values: unknown, next?: string): Promise<ActionResult> {
  const parsed = signInSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  try {
    await signIn("credentials", { ...parsed.data, redirectTo: safeNext(next) });
  } catch (error) {
    if (error instanceof AuthError) return { ok: false, error: "Wrong email or password." };
    throw error;
  }
  return { ok: true, data: undefined };
}

export async function oauthSignInAction(provider: OAuthProviderId, next?: string): Promise<void> {
  if (!enabledOAuthProviders().includes(provider)) redirect("/sign-in");
  await signIn(provider, { redirectTo: safeNext(next) });
}

export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: "/" });
}

export async function verifyEmailAction(values: unknown, next?: string): Promise<ActionResult> {
  const user = await requireUser();
  if (user.emailVerified) redirect(safeNext(next, "/onboarding"));
  const parsed = verifyCodeSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid code." };
  const result = await verifyEmailCode(user.id, parsed.data.code);
  if (result === "verified") redirect(safeNext(next, "/onboarding"));
  return {
    ok: false,
    error: result === "invalid" ? "That code is not right. Check the email and try again." : "That code has expired. Send a new one.",
  };
}

export async function resendCodeAction(): Promise<ActionResult> {
  const user = await requireUser();
  if (user.emailVerified) return { ok: true, data: undefined };
  return runAction(() => resendVerificationCode(user.id, user.email));
}

const onboardingSchema = profileSchema.extend({ workspaceName: workspaceNameSchema.shape.name });

/** Profile + first workspace in one step, then straight into the workspace. */
export async function completeOnboardingAction(values: unknown): Promise<ActionResult> {
  const user = await requireVerifiedUser();
  const result = await runAction(async () => {
    const data = onboardingSchema.parse(values);
    await updateProfile(user.id, data);
    return createWorkspace({ ...user, name: data.name }, { name: data.workspaceName });
  });
  if (!result.ok) return result;
  redirect(`/w/${result.data.slug}`);
}

export async function updateProfileAction(values: unknown): Promise<ActionResult> {
  const user = await requireVerifiedUser();
  return runAction(() => updateProfile(user.id, values));
}
