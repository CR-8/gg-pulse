import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/forms/auth-form";
import { enabledOAuthProviders } from "@/modules/auth/auth.config";
import { safeNext } from "@/modules/auth/schemas";
import { getCurrentUser } from "@/modules/auth/session";

export const metadata: Metadata = { title: "Create account" };

export default async function SignUpPage(props: PageProps<"/sign-up">) {
  const { email, next } = await props.searchParams;
  if (await getCurrentUser()) redirect(safeNext(next));
  return (
    <AuthForm
      mode="sign-up"
      next={typeof next === "string" ? safeNext(next) : undefined}
      defaultEmail={typeof email === "string" ? email.slice(0, 254) : ""}
      providers={enabledOAuthProviders()}
    />
  );
}
