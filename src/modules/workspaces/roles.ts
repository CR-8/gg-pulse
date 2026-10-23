// Workspace roles and member statuses are GG-ops values (shared workspacemembers collection).
export const WORKSPACE_ROLES = ["MAINTAINER", "ADMIN", "MEMBER", "GUEST"] as const;
export type WorkspaceRole = (typeof WORKSPACE_ROLES)[number];

export const MEMBER_STATUSES = ["ACTIVE", "INVITED", "REMOVED"] as const;
export type MemberStatus = (typeof MEMBER_STATUSES)[number];

/** Roles an invite can grant; ownership is never handed out by invite. */
export const INVITE_ROLES = ["ADMIN", "MEMBER", "GUEST"] as const;
export type InviteRole = (typeof INVITE_ROLES)[number];

/** gg-pulse project roles: they only add rights on one project. */
export const PROJECT_ROLES = ["PROJECT_MANAGER", "REVIEWER"] as const;
export type ProjectRole = (typeof PROJECT_ROLES)[number];

export const ROLE_LABELS: Record<WorkspaceRole, string> = {
  MAINTAINER: "Owner",
  ADMIN: "Admin",
  MEMBER: "Member",
  GUEST: "Viewer",
};

export const PROJECT_ROLE_LABELS: Record<ProjectRole, string> = {
  PROJECT_MANAGER: "Project manager",
  REVIEWER: "Reviewer",
};

const RANK: Record<WorkspaceRole, number> = { GUEST: 0, MEMBER: 1, ADMIN: 2, MAINTAINER: 3 };

export function isAtLeast(role: WorkspaceRole, min: WorkspaceRole): boolean {
  return RANK[role] >= RANK[min];
}
