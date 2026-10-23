"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateMilestoneAction } from "@/modules/milestones/actions";
import {
  MILESTONE_STATUSES,
  MILESTONE_STATUS_LABELS,
  type MilestoneStatus,
} from "@/modules/milestones/constants";

export function MilestoneStatusSelect({
  slug,
  milestoneId,
  status,
}: {
  slug: string;
  milestoneId: string;
  status: MilestoneStatus;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <Select
      value={status}
      disabled={pending}
      onValueChange={(next) =>
        startTransition(async () => {
          const result = await updateMilestoneAction(slug, milestoneId, { status: next });
          if (!result.ok) toast.error(result.error);
        })
      }
    >
      <SelectTrigger size="sm" className="w-32" aria-label="Milestone status">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {MILESTONE_STATUSES.map((s) => (
          <SelectItem key={s} value={s}>
            {MILESTONE_STATUS_LABELS[s]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
