import { AppSidebar } from "@/components/navigation/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { requireWorkspace } from "@/modules/workspaces/access";
import { listUserWorkspaces } from "@/modules/workspaces/queries";
import { requireVerifiedUser } from "@/modules/auth/session";

export default async function WorkspaceLayout(props: LayoutProps<"/w/[workspaceSlug]">) {
  const { workspaceSlug } = await props.params;
  // Layouts don't re-run on every navigation, so each page also calls requireWorkspace itself;
  // this call only feeds the shell.
  const scope = await requireWorkspace(workspaceSlug);
  const user = await requireVerifiedUser();
  const workspaces = await listUserWorkspaces(user.id);

  return (
    <SidebarProvider>
      <AppSidebar
        workspace={scope.workspace}
        workspaces={workspaces}
        user={{ name: user.name, email: user.email, image: user.image }}
      />
      <SidebarInset>
        <header className="bg-background/95 sticky top-0 z-10 flex h-12 items-center gap-2 border-b px-4 backdrop-blur md:hidden">
          <SidebarTrigger />
          <span className="truncate text-sm font-semibold">{scope.workspace.name}</span>
        </header>
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:py-8">{props.children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
