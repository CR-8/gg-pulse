"use client";

import { FolderKanban, Home, ListTodo, Settings, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoMark } from "@/components/brand/logo";
import { UserMenu } from "@/components/navigation/user-menu";
import { WorkspaceSwitcher } from "@/components/navigation/workspace-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import type { WorkspaceSummary } from "@/modules/workspaces/queries";

type Props = {
  workspace: { slug: string; name: string };
  workspaces: WorkspaceSummary[];
  user: { name: string; email: string; image: string | null };
};

export function AppSidebar({ workspace, workspaces, user }: Props) {
  const pathname = usePathname();
  const base = `/w/${workspace.slug}`;
  const groups = [
    {
      label: "Workspace",
      items: [
        { href: base, label: "Overview", icon: Home, exact: true },
        { href: `${base}/projects`, label: "Projects", icon: FolderKanban },
        { href: `${base}/tasks`, label: "My tasks", icon: ListTodo },
      ],
    },
    {
      label: "Team",
      items: [
        { href: `${base}/members`, label: "Members", icon: Users },
        { href: `${base}/settings`, label: "Settings", icon: Settings },
      ],
    },
  ];

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-1 py-1 group-data-[collapsible=icon]:justify-center">
          <LogoMark className="size-7 shrink-0" />
          <WorkspaceSwitcher current={workspace} workspaces={workspaces} />
        </div>
      </SidebarHeader>
      <SidebarContent>
        {groups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map(({ href, label, icon: Icon, exact }) => {
                  const active = exact
                    ? pathname === href
                    : pathname === href || pathname.startsWith(`${href}/`);
                  return (
                    <SidebarMenuItem key={href}>
                      <SidebarMenuButton asChild isActive={active} tooltip={label}>
                        <Link href={href}>
                          <Icon />
                          <span>{label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <UserMenu user={user} settingsHref={`${base}/settings`} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
