"use client";

import { Copy, UserPlus } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import {
  changeMemberRoleAction,
  createInviteAction,
  removeMemberAction,
  revokeInviteAction,
} from "@/modules/workspaces/actions";
import { INVITE_ROLES, ROLE_LABELS, type InviteRole } from "@/modules/workspaces/roles";

const ROLE_HINT: Record<InviteRole, string> = {
  ADMIN: "Manages members, settings and every project.",
  MEMBER: "Creates projects and works on tasks.",
  GUEST: "Read-only. Can comment where made a project reviewer.",
};

function copy(text: string) {
  void navigator.clipboard.writeText(text).then(
    () => toast.success("Invite link copied"),
    () => toast.error("Couldn't copy. Select the link and copy it manually."),
  );
}

export function InviteDialog({ slug }: { slug: string }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<InviteRole>("MEMBER");
  const [error, setError] = useState("");
  const [link, setLink] = useState<{ url: string; emailed: boolean } | null>(null);
  const [pending, startTransition] = useTransition();

  const reset = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setEmail("");
      setRole("MEMBER");
      setError("");
      setLink(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={reset}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus /> Invite
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite a teammate</DialogTitle>
          <DialogDescription>
            The invite works only for this email address and expires in 7 days.
          </DialogDescription>
        </DialogHeader>
        {link ? (
          <div className="grid gap-3">
            <p className="text-sm">
              {link.emailed
                ? `We emailed an invite to ${email}. You can also share the link:`
                : "Share this link with them:"}
            </p>
            <div className="flex gap-2">
              <Input
                readOnly
                value={link.url}
                onFocus={(e) => e.currentTarget.select()}
                aria-label="Invite link"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => copy(link.url)}
                aria-label="Copy invite link"
              >
                <Copy />
              </Button>
            </div>
            <DialogFooter>
              <Button onClick={() => reset(false)}>Done</Button>
            </DialogFooter>
          </div>
        ) : (
          <form
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              setError("");
              startTransition(async () => {
                const result = await createInviteAction(slug, { email, role });
                if (result.ok) setLink(result.data);
                else setError(result.error);
              });
            }}
          >
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="grid gap-2">
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                autoFocus
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="invite-role">Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as InviteRole)}>
                <SelectTrigger id="invite-role" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INVITE_ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-muted-foreground text-xs">{ROLE_HINT[role]}</p>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={pending || !email.includes("@")}>
                {pending ? "Creating invite…" : "Create invite"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function MemberRoleSelect({
  slug,
  memberId,
  role,
}: {
  slug: string;
  memberId: string;
  role: InviteRole;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <Select
      value={role}
      disabled={pending}
      onValueChange={(next) =>
        startTransition(async () => {
          const result = await changeMemberRoleAction(slug, { memberId, role: next });
          if (result.ok) toast.success("Role updated");
          else toast.error(result.error);
        })
      }
    >
      <SelectTrigger size="sm" className="w-28" aria-label="Workspace role">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {INVITE_ROLES.map((r) => (
          <SelectItem key={r} value={r}>
            {ROLE_LABELS[r]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function RemoveMemberButton({
  slug,
  memberId,
  name,
}: {
  slug: string;
  memberId: string;
  name: string;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-destructive">
          Remove
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remove {name}?</DialogTitle>
          <DialogDescription>
            They lose access to this workspace immediately. Their tasks, comments and history stay.
            You can invite them again later.
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
                const result = await removeMemberAction(slug, memberId);
                if (result.ok) toast.success(`${name} was removed`);
                else toast.error(result.error);
              })
            }
          >
            {pending ? "Removing…" : "Remove"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function InviteActions({
  slug,
  inviteId,
  url,
}: {
  slug: string;
  inviteId: string;
  url: string;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex justify-end gap-1">
      <Button variant="ghost" size="sm" onClick={() => copy(url)}>
        <Copy /> Copy link
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="text-destructive"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await revokeInviteAction(slug, inviteId);
            if (!result.ok) toast.error(result.error);
          })
        }
      >
        Revoke
      </Button>
    </div>
  );
}
