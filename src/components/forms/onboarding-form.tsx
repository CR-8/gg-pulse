"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { LogoMark } from "@/components/brand/logo";
import { RoleCombobox } from "@/components/forms/role-combobox";
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
import { completeOnboardingAction } from "@/modules/auth/actions";
import { profileSchema } from "@/modules/auth/schemas";
import { workspaceNameSchema } from "@/modules/workspaces/schemas";

const schema = profileSchema.extend({
  jobTitle: z.string().min(1, "Pick the role closest to yours."),
  workspaceName: workspaceNameSchema.shape.name,
});
type Values = z.input<typeof schema>;

export function OnboardingForm({
  defaultName,
  defaultJobTitle,
}: {
  defaultName: string;
  defaultJobTitle: string;
}) {
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: { name: defaultName, jobTitle: defaultJobTitle, workspaceName: "" },
  });
  // useWatch, not form.watch: the React Compiler memoizes away watch() re-renders.
  const firstName = (useWatch({ control: form.control, name: "name" }) ?? "")
    .trim()
    .split(/\s+/)[0];

  const onSubmit = form.handleSubmit((values) => {
    setError("");
    startTransition(async () => {
      const result = await completeOnboardingAction(values);
      if (result && !result.ok) setError(result.error);
    });
  });

  if (pending) {
    return (
      <div
        className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-background"
        role="status"
      >
        <LogoMark className="size-14 animate-pulse" />
        <p className="font-semibold">Setting up your workspace…</p>
        <p className="text-muted-foreground text-sm">
          Please don&apos;t close or refresh this page.
        </p>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="mt-8 grid gap-5" noValidate>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Your name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Alex Smith" autoComplete="name" autoFocus {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="jobTitle"
          render={({ field }) => (
            <FormItem>
              <FormLabel>What is your role?</FormLabel>
              <FormControl>
                <RoleCombobox value={field.value ?? ""} onChange={field.onChange} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="workspaceName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name your workspace</FormLabel>
              <FormControl>
                <Input
                  placeholder={firstName ? `${firstName}'s team` : "e.g. Platform team"}
                  {...field}
                />
              </FormControl>
              <p className="text-muted-foreground text-xs">
                You can invite teammates once it&apos;s created.
              </p>
              <FormMessage />
            </FormItem>
          )}
        />
        <div>
          <Button type="submit" disabled={!form.formState.isValid}>
            Continue
          </Button>
        </div>
      </form>
    </Form>
  );
}
