import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/forms/auth-form";
import { enabledOAuthProviders } from "@/modules/auth/auth.config";
import { safeNext } from "@/modules/auth/schemas";
import { getCurrentUser } from "@/modules/auth/session";

export const metadata: Metadata = { title: "Sign in" };

// Auth.js redirects here with ?error=<code>; only known codes become messages.
const ERRORS: Record<string, string> = {
  UnverifiedEmail: "Your GitHub email address isn't verified. Verify it on GitHub, then try again.",
  AccessDenied: "That account can't sign in. It may have been deactivated.",
  OAuthAccountNotLinked: "Sign in with the method you used before.",
  Configuration: "Sign-in is temporarily unavailable. Try again shortly.",
};

export default async function SignInPage(props: PageProps<"/sign-in">) {
  const { next, error } = await props.searchParams;
  if (await getCurrentUser()) redirect(safeNext(next));
  return (
    <AuthForm
      mode="sign-in"
      next={typeof next === "string" ? safeNext(next) : undefined}
      providers={enabledOAuthProviders()}
      initialError={
        typeof error === "string" ? (ERRORS[error] ?? "Sign-in failed. Try again.") : undefined
      }
    />
  );
}
