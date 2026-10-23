import Link from "next/link";
import { LogoMark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

// Also shown for workspaces and records the visitor can't access, so it never confirms they exist.
export default function NotFound() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center px-4 text-center">
      <LogoMark className="size-12" />
      <h1 className="mt-6 text-xl font-semibold">We couldn&apos;t find that page</h1>
      <p className="text-muted-foreground mt-2 max-w-sm text-sm">
        It may have been moved or archived, or you may not have access to it.
      </p>
      <Button asChild className="mt-6">
        <Link href="/">Back to gg-pulse</Link>
      </Button>
    </div>
  );
}
