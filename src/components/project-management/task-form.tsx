"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import type { Person } from "@/components/data-display/people";
import { AssigneePicker } from "@/components/project-management/assignee-picker";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  PRIORITY_LABELS,
  STATUS_LABELS,
  TASK_PRIORITIES,
  TASK_STATUSES,
  type TaskPriority,
  type TaskStatus,
} from "@/modules/tasks/constants";
import type { CreateTaskInput } from "@/modules/tasks/schemas";

const NONE = "none";

// Field values as the inputs hold them; converted to the service's shape on submit.
const formSchema = z.object({
  title: z.string().trim().min(1, "Give the task a title.").max(200, "Use at most 200 characters."),
  description: z.string().max(10_000, "Use at most 10,000 characters."),
  status: z.enum(TASK_STATUSES),
  priority: z.enum(TASK_PRIORITIES),
  assigneeIds: z.array(z.string()),
  dueDate: z.string(),
  estimateHours: z
    .string()
    .refine(
      (v) => v.trim() === "" || (Number.isFinite(Number(v)) && Number(v) >= 0 && Number(v) <= 1000),
      "Enter hours between 0 and 1000.",
    ),
  milestoneId: z.string(),
});
export type TaskFormValues = z.infer<typeof formSchema>;

export function toTaskInput(v: TaskFormValues): CreateTaskInput {
  return {
    title: v.title,
    description: v.description,
    status: v.status as TaskStatus,
    priority: v.priority as TaskPriority,
    assigneeIds: v.assigneeIds,
    dueDate: v.dueDate,
    estimateHours: v.estimateHours.trim() === "" ? null : Number(v.estimateHours),
    milestoneId: v.milestoneId === NONE ? null : v.milestoneId,
  };
}

export const emptyTask = (status: TaskStatus = "TODO"): TaskFormValues => ({
  title: "",
  description: "",
  status,
  priority: "MEDIUM",
  assigneeIds: [],
  dueDate: "",
  estimateHours: "",
  milestoneId: NONE,
});

export function TaskForm({
  defaultValues,
  people,
  milestones,
  submitLabel,
  readOnly,
  onSubmit,
  footer,
}: {
  defaultValues: TaskFormValues;
  people: Person[];
  milestones: { id: string; name: string }[];
  submitLabel: string;
  readOnly?: boolean;
  onSubmit: (values: TaskFormValues) => Promise<string | null>;
  footer?: React.ReactNode;
}) {
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const form = useForm<TaskFormValues>({ resolver: zodResolver(formSchema), defaultValues });

  const submit = form.handleSubmit((values) => {
    setError("");
    startTransition(async () => {
      const message = await onSubmit(values);
      if (message) setError(message);
      else form.reset(values);
    });
  });

  return (
    <Form {...form}>
      <form onSubmit={submit} className="grid gap-4" noValidate>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <fieldset disabled={readOnly} className="grid gap-4">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Title</FormLabel>
                <FormControl>
                  <Input placeholder="What needs to be done?" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea rows={4} placeholder="Context, acceptance criteria, links" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange} disabled={readOnly}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {TASK_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {STATUS_LABELS[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Priority</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange} disabled={readOnly}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {TASK_PRIORITIES.map((p) => (
                        <SelectItem key={p} value={p}>
                          {PRIORITY_LABELS[p]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="assigneeIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assignees</FormLabel>
                  <FormControl>
                    <AssigneePicker
                      people={people}
                      value={field.value}
                      onChange={field.onChange}
                      disabled={readOnly}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="milestoneId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Milestone</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange} disabled={readOnly}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NONE}>No milestone</SelectItem>
                      {milestones.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Due date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="estimateHours"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estimate (hours)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      max={1000}
                      step={0.5}
                      placeholder="e.g. 6"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </fieldset>
        {!readOnly && (
          <div className="flex items-center justify-end gap-2">
            {footer}
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : submitLabel}
            </Button>
          </div>
        )}
      </form>
    </Form>
  );
}

export const toFormValues = (t: {
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeIds: string[];
  dueDate: string | null;
  estimateHours: number | null;
  milestoneId: string | null;
}): TaskFormValues => ({
  title: t.title,
  description: t.description,
  status: t.status,
  priority: t.priority,
  assigneeIds: t.assigneeIds,
  dueDate: t.dueDate ? t.dueDate.slice(0, 10) : "",
  estimateHours: t.estimateHours === null ? "" : String(t.estimateHours),
  milestoneId: t.milestoneId ?? NONE,
});
