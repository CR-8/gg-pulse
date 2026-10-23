"use client";

import { Check, ChevronDown } from "lucide-react";
import { useState } from "react";
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
import { cn } from "@/lib/utils";

export const JOB_ROLES = [
  "Backend Developer",
  "Frontend Developer",
  "Full-stack Developer",
  "Mobile Developer",
  "Data Engineer",
  "ML Engineer",
  "DevOps / Platform Engineer",
  "QA / Test Engineer",
  "Engineering Manager",
  "Project Manager",
  "Product Manager",
  "Designer",
  "CTO / Engineering Leader",
  "Analyst",
  "Other",
];

/** Searchable single-select, like the reference onboarding's "What is your role?". */
export function RoleCombobox({
  id,
  value,
  onChange,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between font-normal", !value && "text-muted-foreground")}
        >
          {value || "Select your role"}
          <ChevronDown className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
        <Command>
          <CommandInput placeholder="Search roles…" />
          <CommandList>
            <CommandEmpty>No matching role.</CommandEmpty>
            <CommandGroup>
              {JOB_ROLES.map((role) => (
                <CommandItem
                  key={role}
                  value={role}
                  onSelect={() => {
                    onChange(role);
                    setOpen(false);
                  }}
                >
                  {role}
                  <Check className={cn("ml-auto", value === role ? "opacity-100" : "opacity-0")} />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
