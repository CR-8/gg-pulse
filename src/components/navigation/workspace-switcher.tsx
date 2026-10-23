"use client";

import { Check, ChevronsUpDown, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { CreateWorkspaceDialog } from "@/components/navigation/create-workspace-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ROLE_LABELS } from "@/modules/workspaces/roles";
import type { WorkspaceSummary } from "@/modules/workspaces/queries";

export function WorkspaceSwitcher({
  current,
  workspaces,
}: {
  current: { slug: string; name: string };
  workspaces: WorkspaceSummary[];
}) {
  const [creating, setCreating] = useState(false);
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="hover:bg-sidebar-accent flex min-w-0 flex-1 items-center gap-1 rounded-md px-2 py-1.5 text-left text-sm font-semibold group-data-[collapsible=icon]:hidden">
          <span className="truncate">{current.name}</span>
          <ChevronsUpDown className="text-muted-foreground ml-auto size-4 shrink-0" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuLabel className="text-muted-foreground text-xs">
            Workspaces
          </DropdownMenuLabel>
          {workspaces.map((w) => (
            <DropdownMenuItem key={w.id} asChild>
              <Link href={`/w/${w.slug}`} className="flex items-center gap-2">
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{w.name}</span>
                  <span className="text-muted-foreground block text-xs">{ROLE_LABELS[w.role]}</span>
                </span>
                {w.slug === current.slug && <Check className="size-4" />}
              </Link>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setCreating(true)}>
            <Plus /> Create workspace
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <CreateWorkspaceDialog open={creating} onOpenChange={setCreating} />
    </>
  );
}
