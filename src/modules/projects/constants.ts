// GG-ops values (shared projects collection).
export const PROJECT_STATUS_COLORS = ["ON_TRACK", "AT_RISK", "OFF_TRACK", "ON_HOLD"] as const;
export type ProjectStatusColor = (typeof PROJECT_STATUS_COLORS)[number];

export const PROJECT_STATUS_LABELS: Record<ProjectStatusColor, string> = {
  ON_TRACK: "On track",
  AT_RISK: "At risk",
  OFF_TRACK: "Off track",
  ON_HOLD: "On hold",
};
