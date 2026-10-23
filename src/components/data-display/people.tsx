import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn, initials } from "@/lib/utils";

export type Person = { userId: string; name: string; image?: string | null };

export function UserAvatar({ person, className }: { person: Person; className?: string }) {
  return (
    <Avatar className={cn("size-6 text-[10px]", className)}>
      {person.image && <AvatarImage src={person.image} alt="" />}
      <AvatarFallback className="bg-brand-soft text-primary font-semibold">
        {initials(person.name)}
      </AvatarFallback>
    </Avatar>
  );
}

/** Up to `max` overlapping avatars with names on hover. */
export function AvatarStack({ people, max = 3 }: { people: Person[]; max?: number }) {
  if (!people.length) return <span className="text-muted-foreground text-xs">Unassigned</span>;
  const shown = people.slice(0, max);
  return (
    <div className="flex -space-x-1.5">
      {shown.map((p) => (
        <Tooltip key={p.userId}>
          <TooltipTrigger asChild>
            <span className="ring-background rounded-full ring-2">
              <UserAvatar person={p} />
            </span>
          </TooltipTrigger>
          <TooltipContent>{p.name}</TooltipContent>
        </Tooltip>
      ))}
      {people.length > max && (
        <span className="bg-secondary text-muted-foreground ring-background inline-flex size-6 items-center justify-center rounded-full text-[10px] ring-2">
          +{people.length - max}
        </span>
      )}
    </div>
  );
}
