"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
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
import { oauthSignInAction, signInAction, signUpAction } from "@/modules/auth/actions";
import type { OAuthProviderId } from "@/modules/auth/auth.config";
import { signInSchema, signUpSchema } from "@/modules/auth/schemas";

const PROVIDER_LABEL: Record<OAuthProviderId, string> = { google: "Google", github: "GitHub" };

type Values = z.input<typeof signInSchema>;

export function AuthForm({
  mode,
  next,
  defaultEmail = "",
  providers,
  initialError,
}: {
  mode: "sign-in" | "sign-up";
  next?: string;
  defaultEmail?: string;
  providers: OAuthProviderId[];
  initialError?: string;
}) {
  const signingUp = mode === "sign-up";
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(initialError ?? "");
  const [pending, startTransition] = useTransition();
  const form = useForm<Values>({
    resolver: zodResolver(signingUp ? signUpSchema : signInSchema),
    defaultValues: { email: defaultEmail, password: "" },
  });

  const onSubmit = form.handleSubmit((values) => {
    setError("");
    startTransition(async () => {
      const result = signingUp
        ? await signUpAction(values, next)
        : await signInAction(values, next);
      if (!result.ok) setError(result.error);
    });
  });

  return (
    <div className="bg-card rounded-xl border p-6 shadow-sm sm:p-8">
      <h1 className="text-center text-xl font-semibold">
        {signingUp ? "Create your gg-pulse account" : "Sign in to gg-pulse"}
      </h1>

      <Form {...form}>
        <form onSubmit={onSubmit} className="mt-6 grid gap-4" noValidate>
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Work email</FormLabel>
                <FormControl>
                  <Input type="email" autoComplete="email" autoFocus {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel>Password</FormLabel>
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="text-muted-foreground hover:text-foreground text-xs"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
                <FormControl>
                  <Input
                    type={showPassword ? "text" : "password"}
                    autoComplete={signingUp ? "new-password" : "current-password"}
                    {...field}
                  />
                </FormControl>
                {signingUp && !form.formState.errors.password && (
                  <p className="text-muted-foreground text-xs">At least 10 characters.</p>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="mt-1 w-full" disabled={pending}>
            {pending
              ? signingUp
                ? "Creating account…"
                : "Signing in…"
              : signingUp
                ? "Create free account"
                : "Sign in"}
          </Button>
        </form>
      </Form>

      {providers.length > 0 && (
        <>
          <div className="text-muted-foreground my-5 text-center text-sm">or</div>
          <div className="grid gap-2">
            {providers.map((p) => (
              <form key={p} action={oauthSignInAction.bind(null, p, next)}>
                <Button type="submit" variant="outline" className="w-full">
                  {signingUp ? "Sign up" : "Sign in"} with {PROVIDER_LABEL[p]}
                </Button>
              </form>
            ))}
          </div>
        </>
      )}

      <p className="mt-6 text-center text-sm">
        {signingUp ? "Already have an account? " : "New to gg-pulse? "}
        <Link
          className="text-info font-medium hover:underline"
          href={`${signingUp ? "/sign-in" : "/sign-up"}${next ? `?next=${encodeURIComponent(next)}` : ""}`}
        >
          {signingUp ? "Sign in" : "Create an account"}
        </Link>
      </p>
    </div>
  );
}
