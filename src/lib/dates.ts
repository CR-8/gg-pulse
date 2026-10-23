import { z } from "zod";

/** `<input type="date">` value → UTC midnight. Empty string clears the date. */
export const dateInput = z
  .union([z.iso.date(), z.literal("")])
  .transform((value) => (value ? new Date(`${value}T00:00:00.000Z`) : null));

/** UTC midnight Date → `<input type="date">` value. */
export const toDateInput = (value: Date | string | null | undefined) =>
  value ? new Date(value).toISOString().slice(0, 10) : "";

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

export function formatDateTime(value: string | Date): string {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

/** True when a due date (UTC midnight) is before today in UTC. */
export function isPastDue(due: string | Date | null | undefined, now = new Date()): boolean {
  if (!due) return false;
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return new Date(due).getTime() < today;
}
