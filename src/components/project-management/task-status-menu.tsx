"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/data-display/badges";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { updateTaskAction } from "@/modules/tasks/actions";
import { BOARD_COLUMNS, STATUS_LABELS, type TaskStatus } from "@/modules/tasks/constants";

/** The status pill doubles as the control for moving a task (keyboard-accessible, no drag needed). */
export function TaskStatusMenu({
  slug,
  taskId,
  status,
  disabled,
}: {
  slug: string;
  taskId: string;
  status: TaskStatus;
  disabled?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  if (disabled) return <StatusBadge status={status} />;

  const move = (next: string) =>
    startTransition(async () => {
      const result = await updateTaskAction(slug, taskId, { status: next });
      if (!result.ok) toast.error(result.error);
    });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "focus-visible:ring-ring/50 rounded-full outline-none focus-visible:ring-[3px]",
          pending && "opacity-60",
        )}
        aria-label={`Status: ${STATUS_LABELS[status]}. Change status`}
      >
        <StatusBadge status={status} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuLabel className="text-muted-foreground text-xs">Move to</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={status} onValueChange={move}>
          {BOARD_COLUMNS.map((s) => (
            <DropdownMenuRadioItem key={s} value={s}>
              {STATUS_LABELS[s]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
