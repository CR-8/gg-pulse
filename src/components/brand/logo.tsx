import { Activity } from "lucide-react";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("bg-primary text-primary-foreground inline-flex size-8 items-center justify-center rounded-full", className)}
    >
      <Activity className="size-[55%]" strokeWidth={2.5} />
    </span>
  );
}

export function Logo({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark />
      {!compact && <span className="text-primary text-sm font-semibold tracking-[0.18em] uppercase">gg-pulse</span>}
    </span>
  );
}
