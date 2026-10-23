"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { acceptInviteAction } from "@/modules/workspaces/actions";

export function AcceptInviteButton({ token }: { token: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      className="w-full"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await acceptInviteAction(token);
          if (result && !result.ok) toast.error(result.error);
        })
      }
    >
      {pending ? "Joining…" : "Accept invite"}
    </Button>
  );
}
