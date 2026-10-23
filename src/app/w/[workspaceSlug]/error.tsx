"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function WorkspaceError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center rounded-lg border border-dashed px-6 py-16 text-center">
      <span className="bg-danger-soft mb-4 inline-flex size-10 items-center justify-center rounded-full">
        <AlertTriangle className="text-destructive size-5" />
      </span>
      <h1 className="font-semibold">Something went wrong loading this page</h1>
      <p className="text-muted-foreground mt-1 max-w-sm text-sm">
        It may be a temporary problem reaching the database. Your data has not been changed.
      </p>
      <Button className="mt-5" variant="outline" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
