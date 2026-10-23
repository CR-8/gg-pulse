export type ServiceErrorCode = "NOT_FOUND" | "FORBIDDEN" | "INVALID" | "CONFLICT" | "RATE_LIMITED";

/** Expected failures from services. The message is safe to show to the user. */
export class ServiceError extends Error {
  constructor(
    readonly code: ServiceErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ServiceError";
  }
}

export const notFoundError = (what: string) => new ServiceError("NOT_FOUND", `${what} not found.`);
export const forbiddenError = () =>
  new ServiceError("FORBIDDEN", "You don't have permission to do that.");
