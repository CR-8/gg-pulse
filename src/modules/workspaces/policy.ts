import { isAtLeast, type ProjectRole, type WorkspaceRole } from "@/modules/workspaces/roles";

/**
 * The single authorization table (docs/SECURITY.md). Every service checks a capability
 * through `can`; nothing else decides who may do what.
 */
export type Capability =
  | "workspace.update"
  | "members.read"
  | "members.manage"
  | "audit.read"
  | "project.create"
  | "project.manage"
  | "milestone.manage"
  | "task.create"
  | "task.update"
  | "comment.create";

export type Grant = { workspaceRole: WorkspaceRole; projectRole?: ProjectRole | null };

export function can(capability: Capability, { workspaceRole, projectRole }: Grant): boolean {
  const pm = projectRole === "PROJECT_MANAGER";
  switch (capability) {
    case "members.read":
      return true;
    case "workspace.update":
    case "members.manage":
    case "audit.read":
      return isAtLeast(workspaceRole, "ADMIN");
    case "project.create":
    case "task.create":
    case "task.update":
      return isAtLeast(workspaceRole, "MEMBER");
    case "project.manage":
    case "milestone.manage":
      return isAtLeast(workspaceRole, "ADMIN") || (pm && isAtLeast(workspaceRole, "MEMBER"));
    case "comment.create":
      return isAtLeast(workspaceRole, "MEMBER") || projectRole === "REVIEWER";
  }
}
