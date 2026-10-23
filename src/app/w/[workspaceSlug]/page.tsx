import { CalendarClock, FolderPlus, ListChecks, UserPlus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { BoardIllustration } from "@/components/brand/illustration";
import { SignalBadge, StatusBadge } from "@/components/data-display/badges";
import { PageHeader } from "@/components/feedback/states";
import { ActivityTimeline } from "@/components/project-management/activity-timeline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { listUpcomingMilestones } from "@/modules/milestones/queries";
import { getWorkspaceOverview, listMyTasks, listRecentActivity } from "@/modules/tasks/queries";
import { requireWorkspace } from "@/modules/workspaces/access";

export const metadata: Metadata = { title: "Overview" };

export default async function OverviewPage(props: PageProps<"/w/[workspaceSlug]">) {
  const { workspaceSlug } = await props.params;
  const scope = await requireWorkspace(workspaceSlug);
  const base = `/w/${scope.workspace.slug}`;
  const [overview, milestones, activity, myTasks] = await Promise.all([
    getWorkspaceOverview(scope),
    listUpcomingMilestones(scope),
    listRecentActivity(scope),
    listMyTasks(scope),
  ]);
  const isNew = overview.activeProjects === 0;

  const stats = [
    { label: "Active projects", value: overview.activeProjects, href: `${base}/projects` },
    { label: "Open tasks", value: overview.openTasks, href: `${base}/projects` },
    { label: "Assigned to me", value: overview.myOpenTasks, href: `${base}/tasks` },
    { label: "Due in 7 days", value: overview.dueThisWeek, href: `${base}/tasks` },
    {
      label: "Overdue",
      value: overview.overdueTasks,
      tone: overview.overdueTasks ? "text-destructive" : "",
    },
    {
      label: "Blocked",
      value: overview.blockedTasks,
      tone: overview.blockedTasks ? "text-destructive" : "",
    },
  ];

  return (
    <>
      <PageHeader title="Overview" description={scope.workspace.name} />

      <section className="bg-info-soft/60 relative mb-8 overflow-hidden rounded-xl border p-6 sm:p-8">
        <div className="max-w-xl">
          <h2 className="text-2xl font-semibold tracking-tight">
            Welcome to {scope.workspace.name}
          </h2>
          <p className="text-muted-foreground mt-2">
            One place for your team to plan projects, track milestones and see delivery risk before
            it becomes a missed date.
          </p>
        </div>
        <BoardIllustration className="pointer-events-none absolute -right-6 -bottom-10 hidden w-72 opacity-70 md:block" />
      </section>

      {isNew && (
        <section className="mb-8">
          <h2 className="mb-3 font-semibold">Get started</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { icon: FolderPlus, label: "Create a project", href: `${base}/projects?new=1` },
              { icon: UserPlus, label: "Invite teammates", href: `${base}/members` },
              { icon: CalendarClock, label: "Plan milestones", href: `${base}/projects` },
            ].map(({ icon: Icon, label, href }) => (
              <Link
                key={label}
                href={href}
                className="bg-card hover:border-primary/50 flex items-center gap-3 rounded-lg border p-4 transition-colors"
              >
                <span className="bg-brand-soft text-primary inline-flex size-9 items-center justify-center rounded-md">
                  <Icon className="size-5" />
                </span>
                <span className="font-medium">{label}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map((s) => {
          const body = (
            <>
              <div className="text-muted-foreground text-xs">{s.label}</div>
              <div className={cn("mt-1 text-2xl font-semibold tabular-nums", s.tone)}>
                {s.value}
              </div>
            </>
          );
          return s.href ? (
            <Link
              key={s.label}
              href={s.href}
              className="bg-card hover:bg-muted rounded-lg border px-4 py-3 transition-colors"
            >
              {body}
            </Link>
          ) : (
            <div key={s.label} className="bg-card rounded-lg border px-4 py-3">
              {body}
            </div>
          );
        })}
      </section>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="grid gap-6 lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Upcoming milestones</CardTitle>
            </CardHeader>
            <CardContent>
              {milestones.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No open milestones. Add one from a project&apos;s Milestones tab.
                </p>
              ) : (
                <ul className="divide-y">
                  {milestones.map((m) => (
                    <li key={m.id} className="py-3 first:pt-0 last:pb-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`${base}/projects/${m.projectId}/milestones`}
                          className="font-medium hover:underline"
                        >
                          {m.name}
                        </Link>
                        <SignalBadge level={m.signal.level} />
                        <span className="text-muted-foreground ml-auto text-xs">
                          {m.projectName}
                          {m.dueDate ? ` · due ${formatDate(m.dueDate)}` : ""}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center gap-3">
                        <Progress
                          value={m.progress.percent}
                          className="h-1.5"
                          aria-label={`${m.progress.percent}% done`}
                        />
                        <span className="text-muted-foreground w-24 shrink-0 text-right text-xs tabular-nums">
                          {m.progress.done}/{m.progress.total} done
                        </span>
                      </div>
                      <p className="text-muted-foreground mt-1 text-xs">{m.signal.reason}</p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">My open tasks</CardTitle>
              <Link href={`${base}/tasks`} className="text-info text-sm hover:underline">
                View all
              </Link>
            </CardHeader>
            <CardContent>
              {myTasks.length === 0 ? (
                <p className="text-muted-foreground flex items-center gap-2 text-sm">
                  <ListChecks className="size-4" /> Nothing assigned to you right now.
                </p>
              ) : (
                <ul className="divide-y">
                  {myTasks.slice(0, 6).map((t) => (
                    <li
                      key={t.id}
                      className="flex flex-wrap items-center gap-2 py-2.5 first:pt-0 last:pb-0"
                    >
                      <Link
                        href={`${base}/projects/${t.projectId}/tasks/${t.id}`}
                        className="min-w-0 flex-1 truncate text-sm font-medium hover:underline"
                      >
                        {t.title}
                      </Link>
                      <StatusBadge status={t.status} />
                      <span
                        className={cn(
                          "w-24 text-right text-xs",
                          t.isOverdue ? "text-destructive font-medium" : "text-muted-foreground",
                        )}
                      >
                        {t.dueDate ? formatDate(t.dueDate) : "No due date"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Recent activity</CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityTimeline
              empty="Activity from projects and tasks will show up here."
              entries={activity.map((a) => ({
                ...a,
                target:
                  a.taskId && a.taskTitle && a.projectId
                    ? {
                        label: a.taskTitle,
                        href: `${base}/projects/${a.projectId}/tasks/${a.taskId}`,
                      }
                    : a.projectId && a.projectName
                      ? { label: a.projectName, href: `${base}/projects/${a.projectId}` }
                      : null,
                projectName: a.taskId ? a.projectName : null,
              }))}
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
