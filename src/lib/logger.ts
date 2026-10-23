type Level = "info" | "warn" | "error";

function emit(level: Level, message: string, context?: Record<string, unknown>) {
  const line = JSON.stringify({ level, message, time: new Date().toISOString(), ...context });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

/** Structured JSON lines; same shape as GG-ops so one log pipeline reads both. */
export const logger = {
  info: (message: string, context?: Record<string, unknown>) => emit("info", message, context),
  warn: (message: string, context?: Record<string, unknown>) => emit("warn", message, context),
  error: (message: string, context?: Record<string, unknown>) => emit("error", message, context),
};

export const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));
