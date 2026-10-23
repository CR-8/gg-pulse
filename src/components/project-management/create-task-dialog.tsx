"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { Person } from "@/components/data-display/people";
import { emptyTask, TaskForm, toTaskInput } from "@/components/project-management/task-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createTaskAction } from "@/modules/tasks/actions";
import type { TaskStatus } from "@/modules/tasks/constants";

export function CreateTaskDialog({
  slug,
  projectId,
  people,
  milestones,
  status,
  trigger,
}: {
  slug: string;
  projectId: string;
  people: Person[];
  milestones: { id: string; name: string }[];
  status?: TaskStatus;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Plus /> New task
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>New task</DialogTitle>
          <DialogDescription>
            Only the title is required. Estimates make workload views more accurate.
          </DialogDescription>
        </DialogHeader>
        <TaskForm
          defaultValues={emptyTask(status)}
          people={people}
          milestones={milestones}
          submitLabel="Create task"
          onSubmit={async (values) => {
            const result = await createTaskAction(slug, projectId, toTaskInput(values));
            if (!result.ok) return result.error;
            toast.success("Task created");
            setOpen(false);
            return null;
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
