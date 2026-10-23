import { z } from "zod";

export const emailSchema = z.email("Enter a valid email address.").trim().toLowerCase().max(254);

export const signUpSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(10, "Use at least 10 characters.")
    .max(128, "Use at most 128 characters."),
});

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password.").max(128),
});

export const verifyCodeSchema = z.object({
  code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code from the email."),
});

export const profileSchema = z.object({
  name: z.string().trim().min(1, "Enter your name.").max(80),
  jobTitle: z.string().trim().max(80).optional().default(""),
});

/** Same-site relative path only: "//host" and "/\host" leave the site in browsers. */
export function safeNext(value: unknown, fallback = "/"): string {
  return typeof value === "string" && value.startsWith("/") && !/^\/[/\\]/.test(value)
    ? value
    : fallback;
}
