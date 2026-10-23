import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BoardIllustration } from "@/components/brand/illustration";
import { Logo } from "@/components/brand/logo";
import { OnboardingForm } from "@/components/forms/onboarding-form";
import { requireVerifiedUser } from "@/modules/auth/session";
import { listUserWorkspaces } from "@/modules/workspaces/queries";

export const metadata: Metadata = { title: "Welcome" };

export default async function OnboardingPage() {
  const user = await requireVerifiedUser();
  const [first] = await listUserWorkspaces(user.id);
  // Onboarding is for people with no workspace yet; invited members land in theirs.
  if (first) redirect(`/w/${first.slug}`);
  // The sign-up placeholder name is the email's local part; don't prefill it as if it were real.
  const name = user.name === user.email.split("@")[0] ? "" : user.name;

  return (
    <div className="min-h-svh">
      <header className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <Logo />
      </header>
      <main className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-6 pb-16 sm:px-6 lg:grid-cols-2">
        <div className="w-full max-w-md">
          <h1 className="text-2xl leading-tight font-semibold tracking-tight sm:text-3xl">
            Welcome to gg-pulse! Tell us a bit about yourself.
          </h1>
          <OnboardingForm defaultName={name} defaultJobTitle={user.jobTitle ?? ""} />
        </div>
        <BoardIllustration className="hidden w-full max-w-lg lg:block" />
      </main>
    </div>
  );
}
