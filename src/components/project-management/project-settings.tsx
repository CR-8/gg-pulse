"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  archiveProjectAction,
  setProjectRoleAction,
  updateProjectAction,
} from "@/modules/projects/actions";
import {
  PROJECT_STATUS_COLORS,
  PROJECT_STATUS_LABELS,
  type ProjectStatusColor,
} from "@/modules/projects/constants";
import { PROJECT_ROLES, PROJECT_ROLE_LABELS, type ProjectRole } from "@/modules/workspaces/roles";

const NONE = "none";

export function ProjectDetailsForm({
  slug,
  project,
}: {
  slug: string;
  project: {
    id: string;
    name: string;
    description: string | null;
    statusColor: ProjectStatusColor | null;
    statusNote: string | null;
  };
}) {
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? "");
  const [statusColor, setStatusColor] = useState<string>(project.statusColor ?? NONE);
  const [statusNote, setStatusNote] = useState(project.statusNote ?? "");
  const [pending, startTransition] = useTransition();

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const result = await updateProjectAction(slug, project.id, {
        name,
        description,
        statusColor: statusColor === NONE ? null : statusColor,
        statusNote,
      });
      if (result.ok) toast.success("Project saved");
      else toast.error(result.error);
    });
  };

  return (
    <form onSubmit={save} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="project-name">Name</Label>
        <Input id="project-name" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="project-description">Objective</Label>
        <Textarea
          id="project-description"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-[12rem_1fr]">
        <div className="grid gap-2">
          <Label htmlFor="project-status">Status</Label>
          <Select value={statusColor} onValueChange={setStatusColor}>
            <SelectTrigger id="project-status" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Not set</SelectItem>
              {PROJECT_STATUS_COLORS.map((s) => (
                <SelectItem key={s} value={s}>
                  {PROJECT_STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="project-status-note">Status note</Label>
          <Input
            id="project-status-note"
            value={statusNote}
            onChange={(e) => setStatusNote(e.target.value)}
            placeholder="Why this status? (shared with the team)"
          />
        </div>
      </div>
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}

export function ProjectRoleSelect({
  slug,
  projectId,
  userId,
  role,
  disabled,
}: {
  slug: string;
  projectId: string;
  userId: string;
  role: ProjectRole | null;
  disabled?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <Select
      value={role ?? NONE}
      disabled={disabled || pending}
      onValueChange={(next) =>
        startTransition(async () => {
          const result = await setProjectRoleAction(slug, projectId, {
            userId,
            role: next === NONE ? null : next,
          });
          if (!result.ok) toast.error(result.error);
        })
      }
    >
      <SelectTrigger size="sm" className="w-40" aria-label="Project role">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>No project role</SelectItem>
        {PROJECT_ROLES.map((r) => (
          <SelectItem key={r} value={r}>
            {PROJECT_ROLE_LABELS[r]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function ArchiveProjectButton({
  slug,
  projectId,
  name,
}: {
  slug: string;
  projectId: string;
  name: string;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="text-destructive">
          Archive project
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Archive {name}?</DialogTitle>
          <DialogDescription>
            It disappears from project lists, boards and dashboards for everyone. Tasks are kept,
            nothing is deleted.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button
            variant="destructive"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await archiveProjectAction(slug, projectId);
                if (result && !result.ok) toast.error(result.error);
              })
            }
          >
            {pending ? "Archiving…" : "Archive"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
