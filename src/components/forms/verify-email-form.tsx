"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resendCodeAction, signOutAction, verifyEmailAction } from "@/modules/auth/actions";

export function VerifyEmailForm({ email, next }: { email: string; next?: string }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const [resending, startResend] = useTransition();

  const verify = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const result = await verifyEmailAction({ code }, next);
      if (result && !result.ok) setError(result.error);
    });
  };

  const resend = () =>
    startResend(async () => {
      const result = await resendCodeAction();
      if (result.ok) toast.success(`A new code is on its way to ${email}.`);
      else toast.error(result.error);
    });

  return (
    <>
      <form onSubmit={verify} className="mt-6 grid gap-3">
        <div className="grid gap-1">
          <Label htmlFor="code">Enter verification code</Label>
          <p className="text-muted-foreground text-sm">We sent a 6-digit code to {email}.</p>
        </div>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <Input
          id="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="Enter 6 digit code"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          autoFocus
        />
        <Button type="submit" disabled={pending || code.length !== 6}>
          {pending ? "Verifying…" : "Verify account"}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm">
        Didn&apos;t receive the email?{" "}
        <button
          type="button"
          onClick={resend}
          disabled={resending}
          className="text-info font-medium hover:underline"
        >
          {resending ? "Sending…" : "Resend verification code"}
        </button>
      </p>
      <form action={signOutAction} className="mt-2 text-center">
        <button type="submit" className="text-muted-foreground text-xs hover:underline">
          Use a different account
        </button>
      </form>
    </>
  );
}
