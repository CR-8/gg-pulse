import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LogoMark } from "@/components/brand/logo";
import { VerifyEmailForm } from "@/components/forms/verify-email-form";
import { getEnv, hasEmailTransport } from "@/lib/env";
import { safeNext } from "@/modules/auth/schemas";
import { requireUser } from "@/modules/auth/session";

export const metadata: Metadata = { title: "Verify your account" };

export default async function VerifyEmailPage(props: PageProps<"/verify-email">) {
  const user = await requireUser();
  const { next } = await props.searchParams;
  if (user.emailVerified) redirect(safeNext(next, "/onboarding"));
  const env = getEnv();

  return (
    <div className="from-background via-background to-brand-soft flex min-h-svh flex-col items-center bg-gradient-to-b px-4 py-14">
      <LogoMark className="size-16" />
      <div className="bg-card mt-10 w-full max-w-md rounded-xl border p-6 shadow-sm sm:p-8">
        <h1 className="text-center text-2xl font-semibold">Verify your account</h1>
        <VerifyEmailForm
          email={user.email}
          next={typeof next === "string" ? safeNext(next) : undefined}
        />
        {!hasEmailTransport(env) && env.NODE_ENV !== "production" && (
          <p className="text-muted-foreground bg-muted mt-4 rounded-md p-3 text-xs">
            Email isn&apos;t configured on this development server, so the code is written to the
            server log instead.
          </p>
        )}
      </div>
    </div>
  );
}
