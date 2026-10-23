"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { RoleCombobox } from "@/components/forms/role-combobox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProfileAction } from "@/modules/auth/actions";
import { renameWorkspaceAction } from "@/modules/workspaces/actions";

export function ProfileForm({
  name: initialName,
  jobTitle: initialJobTitle,
}: {
  name: string;
  jobTitle: string;
}) {
  const [name, setName] = useState(initialName);
  const [jobTitle, setJobTitle] = useState(initialJobTitle);
  const [pending, startTransition] = useTransition();
  return (
    <form
      className="grid max-w-md gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const result = await updateProfileAction({ name, jobTitle });
          if (result.ok) toast.success("Profile saved");
          else toast.error(result.error);
        });
      }}
    >
      <div className="grid gap-2">
        <Label htmlFor="profile-name">Your name</Label>
        <Input
          id="profile-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="profile-role">Role</Label>
        <RoleCombobox id="profile-role" value={jobTitle} onChange={setJobTitle} />
      </div>
      <div>
        <Button type="submit" disabled={pending || !name.trim()}>
          {pending ? "Saving…" : "Save profile"}
        </Button>
      </div>
    </form>
  );
}

export function WorkspaceNameForm({ slug, name: initialName }: { slug: string; name: string }) {
  const [name, setName] = useState(initialName);
  const [pending, startTransition] = useTransition();
  return (
    <form
      className="grid max-w-md gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const result = await renameWorkspaceAction(slug, { name });
          if (result.ok) toast.success("Workspace renamed");
          else toast.error(result.error);
        });
      }}
    >
      <div className="grid gap-2">
        <Label htmlFor="workspace-name">Workspace name</Label>
        <Input id="workspace-name" value={name} onChange={(e) => setName(e.target.value)} />
        <p className="text-muted-foreground text-xs">
          The URL (/w/{slug}) stays the same so links keep working.
        </p>
      </div>
      <div>
        <Button
          type="submit"
          disabled={pending || name.trim().length < 2 || name.trim() === initialName}
        >
          {pending ? "Saving…" : "Rename"}
        </Button>
      </div>
    </form>
  );
}
