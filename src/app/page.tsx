import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarClock, GitPullRequest, Gauge, ListChecks } from "lucide-react";
import { BoardIllustration } from "@/components/brand/illustration";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getCurrentUser } from "@/modules/auth/session";
import { listUserWorkspaces } from "@/modules/workspaces/queries";

const FEATURES = [
  {
    icon: ListChecks,
    title: "Plan the work",
    body: "Projects, milestones and tasks with owners, estimates and due dates, on a board or a list.",
  },
  {
    icon: CalendarClock,
    title: "See delivery risk early",
    body: "Every milestone shows whether it is on track, at risk or overdue, and says exactly why.",
  },
  {
    icon: Gauge,
    title: "Shared with GG-ops",
    body: "Same accounts, workspaces and tasks as GG-ops when both point at one database.",
  },
  {
    icon: GitPullRequest,
    title: "Engineering intelligence (next)",
    body: "Repository sync, pull requests, CI breakages and AI review are being rebuilt from the gg-docs portal.",
  },
];

export default async function Home() {
  const user = await getCurrentUser();
  if (user) {
    if (!user.emailVerified) redirect("/verify-email");
    const [first] = await listUserWorkspaces(user.id);
    redirect(first ? `/w/${first.slug}` : "/onboarding");
  }

  return (
    <div className="min-h-svh">
      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <nav className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link href="/sign-in">Sign in</Link>
            </Button>
            <Button asChild>
              <Link href="/sign-up">Sign up for free</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 sm:px-6 md:grid-cols-2 md:py-20">
          <div>
            <h1 className="text-4xl leading-[1.1] font-semibold tracking-tight text-balance sm:text-5xl">
              Plan the work. See how delivery is really going.
            </h1>
            <p className="text-muted-foreground mt-5 max-w-lg text-lg">
              gg-pulse brings projects, milestones and tasks together with the engineering signals
              behind them, so a late milestone comes with its reasons.
            </p>
            <form action="/sign-up" className="mt-8 flex max-w-md flex-col gap-2 sm:flex-row">
              <label htmlFor="hero-email" className="sr-only">
                Work email
              </label>
              <Input
                id="hero-email"
                name="email"
                type="email"
                placeholder="name@company.com"
                className="h-11"
              />
              <Button type="submit" className="h-11 px-5">
                Sign up for free
              </Button>
            </form>
          </div>
          <BoardIllustration className="mx-auto w-full max-w-lg" />
        </section>

        <section className="bg-muted/60 border-t">
          <div className="mx-auto grid max-w-6xl gap-6 px-4 py-14 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <div key={title}>
                <span className="bg-brand-soft text-primary inline-flex size-9 items-center justify-center rounded-md">
                  <Icon className="size-5" />
                </span>
                <h2 className="mt-3 font-semibold">{title}</h2>
                <p className="text-muted-foreground mt-1 text-sm">{body}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
