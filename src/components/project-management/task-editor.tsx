"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import type { Person } from "@/components/data-display/people";
import {
  TaskForm,
  toTaskInput,
  type TaskFormValues,
} from "@/components/project-management/task-form";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { addCommentAction, updateTaskAction } from "@/modules/tasks/actions";

export function TaskEditor(props: {
  slug: string;
  taskId: string;
  values: TaskFormValues;
  people: Person[];
  milestones: { id: string; name: string }[];
  readOnly: boolean;
}) {
  return (
    <TaskForm
      defaultValues={props.values}
      people={props.people}
      milestones={props.milestones}
      readOnly={props.readOnly}
      submitLabel="Save changes"
      onSubmit={async (values) => {
        const result = await updateTaskAction(props.slug, props.taskId, toTaskInput(values));
        if (!result.ok) return result.error;
        toast.success("Task saved");
        return null;
      }}
    />
  );
}

export function CommentForm({ slug, taskId }: { slug: string; taskId: string }) {
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();
  return (
    <form
      className="grid gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const result = await addCommentAction(slug, taskId, { body });
          if (!result.ok) return void toast.error(result.error);
          setBody("");
        });
      }}
    >
      <label htmlFor="comment" className="sr-only">
        Add a comment
      </label>
      <Textarea
        id="comment"
        rows={3}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Add a comment, a blocker, a decision…"
      />
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={pending || !body.trim()}>
          {pending ? "Posting…" : "Comment"}
        </Button>
      </div>
    </form>
  );
}
