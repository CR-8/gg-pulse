import { Check } from "lucide-react";
import Link from "next/link";
import { BoardIllustration } from "@/components/brand/illustration";
import { LogoMark } from "@/components/brand/logo";

const REASONS = [
  "Plan projects, milestones and tasks in one workspace",
  "See which milestones are at risk, and why",
  "Use the same account as GG-ops",
  "It's free",
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="from-background via-background to-brand-soft min-h-svh bg-gradient-to-b">
      <div className="mx-auto grid min-h-svh max-w-6xl items-center gap-12 px-4 py-10 sm:px-6 lg:grid-cols-2">
        <div className="hidden lg:block">
          <Link href="/" aria-label="gg-pulse home">
            <LogoMark className="size-16" />
          </Link>
          <h2 className="mt-8 text-xl font-semibold">Why gg-pulse?</h2>
          <ul className="mt-4 space-y-3">
            {REASONS.map((r) => (
              <li key={r} className="flex items-start gap-3">
                <Check className="text-primary mt-0.5 size-4 shrink-0" />
                <span>{r}</span>
              </li>
            ))}
          </ul>
          <BoardIllustration className="mt-10 w-full max-w-md opacity-90" />
        </div>
        <div className="mx-auto w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
