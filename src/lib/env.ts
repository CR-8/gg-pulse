import { z } from "zod";

const optional = z.string().min(1).optional();

export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  MONGODB_URI: z.string().startsWith("mongodb"),
  AUTH_SECRET: z.string().min(16, "AUTH_SECRET must be at least 16 characters"),
  APP_URL: z.url().optional(),

  // Optional sign-in providers: a provider appears only when both of its values are set.
  AUTH_GOOGLE_ID: optional,
  AUTH_GOOGLE_SECRET: optional,
  AUTH_GITHUB_ID: optional,
  AUTH_GITHUB_SECRET: optional,

  // Email: Resend (HTTP) is used when its key is set, otherwise SMTP, otherwise (dev only) the console.
  EMAIL_FROM: optional,
  RESEND_API_KEY: optional,
  SMTP_HOST: optional,
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).optional(),
  SMTP_USER: optional,
  SMTP_PASS: optional,
});

export type Env = z.infer<typeof envSchema>;

export function hasEmailTransport(env: Env): boolean {
  return !!(env.RESEND_API_KEY || (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS));
}

/** Pure: throws one readable error listing every problem. */
export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `  ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid environment variables:\n${issues}`);
  }
  const env = result.data;
  const pairs: [keyof Env, keyof Env][] = [
    ["AUTH_GOOGLE_ID", "AUTH_GOOGLE_SECRET"],
    ["AUTH_GITHUB_ID", "AUTH_GITHUB_SECRET"],
  ];
  for (const [a, b] of pairs) {
    if (!!env[a] !== !!env[b])
      throw new Error(`Invalid environment variables:\n  set ${a} and ${b} together`);
  }
  if (env.NODE_ENV === "production") {
    const missing = [!env.APP_URL && "APP_URL", !env.EMAIL_FROM && "EMAIL_FROM"].filter(Boolean);
    if (!hasEmailTransport(env)) missing.push("RESEND_API_KEY or SMTP_HOST/SMTP_USER/SMTP_PASS");
    if (missing.length) {
      throw new Error(
        `Invalid environment variables:\n  production requires ${missing.join(", ")}`,
      );
    }
  }
  return env;
}

let cached: Env | undefined;

/** Validates `process.env` once, on first use, so builds and tests stay side-effect free. */
export function getEnv(): Env {
  if (cached) return cached;
  const source: Record<string, string | undefined> = {};
  // Blank placeholder lines (`FOO=`) count as unset.
  for (const [key, value] of Object.entries(process.env))
    source[key] = value === "" ? undefined : value;
  return (cached = parseEnv(source));
}

export const env = new Proxy({} as Env, {
  get: (_target, prop: string) => getEnv()[prop as keyof Env],
});
