"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function ProjectTabs({ base }: { base: string }) {
  const pathname = usePathname();
  const tabs = [
    { href: base, label: "Board", match: (p: string) => p === base },
    { href: `${base}/list`, label: "List", match: (p: string) => p === `${base}/list` },
    {
      href: `${base}/milestones`,
      label: "Milestones",
      match: (p: string) => p.startsWith(`${base}/milestones`),
    },
    {
      href: `${base}/settings`,
      label: "Team & settings",
      match: (p: string) => p.startsWith(`${base}/settings`),
    },
  ];
  return (
    <nav className="mb-6 flex gap-1 overflow-x-auto border-b" aria-label="Project views">
      {tabs.map((t) => {
        const active = t.match(pathname);
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm whitespace-nowrap transition-colors",
              active
                ? "border-primary text-foreground font-medium"
                : "text-muted-foreground hover:text-foreground border-transparent",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
