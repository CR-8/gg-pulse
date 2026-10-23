import { notFound } from "next/navigation";
import { ServiceError } from "@/lib/errors";

/** For pages: a NOT_FOUND from a service (including cross-workspace ids) renders the 404 page. */
export async function orNotFound<T>(promise: Promise<T>): Promise<T> {
  try {
    return await promise;
  } catch (error) {
    if (error instanceof ServiceError && error.code === "NOT_FOUND") notFound();
    throw error;
  }
}
