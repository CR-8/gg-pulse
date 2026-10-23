"use client";

import { Check, ChevronDown } from "lucide-react";
import { useState } from "react";
import { AvatarStack, UserAvatar, type Person } from "@/components/data-display/people";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MAX_ASSIGNEES } from "@/modules/tasks/constants";
import { cn } from "@/lib/utils";

export function AssigneePicker({
  id,
  people,
  value,
  onChange,
  disabled,
}: {
  id?: string;
  people: Person[];
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = people.filter((p) => value.includes(p.userId));
  const toggle = (userId: string) =>
    onChange(
      value.includes(userId)
        ? value.filter((v) => v !== userId)
        : [...value, userId].slice(0, MAX_ASSIGNEES),
    );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          className="w-full justify-between font-normal"
        >
          {selected.length ? (
            <span className="flex min-w-0 items-center gap-2">
              <AvatarStack people={selected} />
              <span className="truncate text-sm">
                {selected.length === 1 ? selected[0]?.name : `${selected.length} people`}
              </span>
            </span>
          ) : (
            <span className="text-muted-foreground">Unassigned</span>
          )}
          <ChevronDown className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) min-w-60 p-0" align="start">
        <Command>
          <CommandInput placeholder="Search people…" />
          <CommandList>
            <CommandEmpty>No one by that name.</CommandEmpty>
            <CommandGroup>
              {people.map((p) => (
                <CommandItem key={p.userId} value={p.name} onSelect={() => toggle(p.userId)}>
                  <UserAvatar person={p} />
                  <span className="truncate">{p.name}</span>
                  <Check
                    className={cn(
                      "ml-auto",
                      value.includes(p.userId) ? "opacity-100" : "opacity-0",
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
