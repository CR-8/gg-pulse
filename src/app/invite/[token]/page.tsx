import type { Metadata } from "next";
import Link from "next/link";
import { LogoMark } from "@/components/brand/logo";
import { AcceptInviteButton } from "@/components/forms/accept-invite-button";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/modules/auth/session";
import { ROLE_LABELS } from "@/modules/workspaces/roles";
import { getInvitePreview } from "@/modules/workspaces/queries";

export const metadata: Metadata = { title: "Invitation" };

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="from-background via-background to-brand-soft flex min-h-svh flex-col items-center bg-gradient-to-b px-4 py-14">
      <LogoMark className="size-16" />
      <div className="bg-card mt-10 w-full max-w-md rounded-xl border p-6 text-center shadow-sm sm:p-8">
        {children}
      </div>
    </div>
  );
}

export default async function InvitePage(props: PageProps<"/invite/[token]">) {
  const { token } = await props.params;
  const [invite, user] = await Promise.all([getInvitePreview(token), getCurrentUser()]);

  if (!invite || invite.status !== "valid") {
    return (
      <Shell>
        <h1 className="text-xl font-semibold">This invite can&apos;t be used</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          {invite?.status === "accepted"
            ? "It has already been accepted."
            : "The link is invalid or has expired. Ask a workspace admin for a new one."}
        </p>
        <Button asChild variant="outline" className="mt-6">
          <Link href="/">Go to gg-pulse</Link>
        </Button>
      </Shell>
    );
  }

  const next = `/invite/${token}`;
  return (
    <Shell>
      <p className="text-muted-foreground text-sm">You&apos;ve been invited to join</p>
      <h1 className="mt-1 text-2xl font-semibold">{invite.workspaceName}</h1>
      <p className="text-muted-foreground mt-2 text-sm">
        as <span className="text-foreground font-medium">{ROLE_LABELS[invite.role]}</span>, for{" "}
        {invite.email}
      </p>
      <div className="mt-8">
        {!user ? (
          <div className="grid gap-2">
            <Button asChild>
              <Link
                href={`/sign-up?email=${encodeURIComponent(invite.email)}&next=${encodeURIComponent(next)}`}
              >
                Create an account to join
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/sign-in?next=${encodeURIComponent(next)}`}>
                I already have an account
              </Link>
            </Button>
          </div>
        ) : user.email !== invite.email ? (
          <p className="bg-warning-soft text-warning rounded-md p-3 text-sm">
            You&apos;re signed in as {user.email}. Sign in as {invite.email} to accept this invite.
          </p>
        ) : !user.emailVerified ? (
          <Button asChild>
            <Link href={`/verify-email?next=${encodeURIComponent(next)}`}>
              Verify your email to join
            </Link>
          </Button>
        ) : (
          <AcceptInviteButton token={token} />
        )}
      </div>
    </Shell>
  );
}
