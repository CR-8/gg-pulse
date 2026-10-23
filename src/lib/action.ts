import { unstable_rethrow } from "next/navigation";
import { ZodError } from "zod";
import { ServiceError } from "@/lib/errors";
import { errorMessage, logger } from "@/lib/logger";

/** What every Server Action returns to the client (same shape as GG-ops). */
export type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: string };

/**
 * One error funnel for Server Actions: expected failures become messages, framework
 * signals (redirect, notFound) pass through, anything else is logged and hidden.
 */
export async function runAction<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (error) {
    if (error instanceof ServiceError) return { ok: false, error: error.message };
    if (error instanceof ZodError) {
      return { ok: false, error: error.issues[0]?.message ?? "Invalid input." };
    }
    unstable_rethrow(error);
    logger.error("Unhandled action error", { error: errorMessage(error) });
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}
