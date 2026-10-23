import { env, getEnv, hasEmailTransport } from "@/lib/env";
import { logger } from "@/lib/logger";

type Mail = { to: string; subject: string; text: string };

/**
 * Sends plain-text mail through Resend (HTTP) or SMTP. With neither configured, which env
 * validation only allows outside production, the message is logged so local flows work.
 */
export async function sendMail(mail: Mail): Promise<void> {
  if (!hasEmailTransport(getEnv())) {
    logger.warn("Email transport not configured; message logged instead", { ...mail });
    return;
  }
  const from = env.EMAIL_FROM ?? "gg-pulse <noreply@localhost>";
  if (env.RESEND_API_KEY) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: mail.to, subject: mail.subject, text: mail.text }),
    });
    if (!res.ok) throw new Error(`Resend responded ${res.status}`);
    return;
  }
  const nodemailer = await import("nodemailer");
  const transport = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT ?? 587,
    secure: env.SMTP_PORT === 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
  });
  await transport.sendMail({ from, ...mail });
}

export function appUrl(path: string): string {
  return new URL(path, env.APP_URL ?? "http://localhost:3000").toString();
}
