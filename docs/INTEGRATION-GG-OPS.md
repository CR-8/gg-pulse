# Integration with GG-ops

GG-ops (`D:\Pratyush Tiwari\GG-ops`, app in `my-app/`) is the team's Asana-style project-management app. gg-pulse adds
engineering intelligence and delivery analysis on top of the same people, workspaces, projects and tasks. This
document is the contract that keeps the two apps able to share one MongoDB database.

## Decision

gg-pulse **mirrors GG-ops's collection contracts** for identity, tenancy and project management and owns only the
collections GG-ops does not have.

Why not a separate task model: two task systems for the same team would need a sync layer, duplicate people and
diverging permissions. Why not call GG-ops over HTTP: gg-pulse's analysis (dependencies, workload, health) needs to
scan tasks in bulk, and GG-ops's REST API is page-oriented. Sharing the database is the lowest-moving-parts option;
the cost is a schema contract, enforced below.

## Deployment modes

| Mode | `MONGODB_URI` | Result |
|---|---|---|
| Standalone (default for local dev) | its own database, e.g. `mongodb://127.0.0.1:27017/gg-pulse` | Independent app; data stays schema-compatible, so it can be merged into GG-ops's database later with `mongodump`/`mongorestore` of the shared collections. |
| Integrated | GG-ops's database | Same accounts, passwords, workspaces, members, projects, tasks, comments and activity in both apps. |

## Shared collections (GG-ops owns the schema)

gg-pulse declares these with GG-ops's exact field names, types, defaults, enums and indexes (copied from GG-ops
`main` @ `7146c78`):

| Collection | gg-pulse model | gg-pulse writes |
|---|---|---|
| `users` | `src/models/User.ts` | sign-up, profile (name, jobTitle), email verification timestamp |
| `workspaces` | `src/models/Workspace.ts` | create, rename |
| `workspacemembers` | `src/models/WorkspaceMember.ts` | owner membership, invite acceptance, role change, removal (`status: "REMOVED"`) |
| `workspaceinvites` | `src/models/WorkspaceInvite.ts` | create, accept |
| `projects` | `src/models/Project.ts` | create, edit, archive (`archivedAt`) |
| `tasks` | `src/models/Task.ts` | create, edit |
| `comments` | `src/models/Comment.ts` | create |
| `activitylogs` | `src/models/ActivityLog.ts` | append |

Rules gg-pulse follows on shared collections:

1. **Only GG-ops enum values are written.** Task status stays `TODO | IN_PROGRESS | DONE | BLOCKED`; priority
   `LOW | MEDIUM | HIGH | URGENT`; workspace role `MAINTAINER | ADMIN | MEMBER | GUEST`; member status
   `ACTIVE | INVITED | REMOVED`; activity `entityType` stays within GG-ops's list. Review states that GG-ops has no
   status for live in gg-pulse-owned collections.
2. **No extra indexes on shared collections.** GG-ops's deploy runs `syncIndexes()`, which drops undeclared indexes.
   gg-pulse declares exactly GG-ops's indexes there and never runs `syncIndexes()` itself
   (`npm run db:indexes` only calls `createIndexes()`).
3. **Extension fields are additive and nullable.** gg-pulse adds two fields to `tasks`:
   `milestoneId` (ObjectId | null) and `estimateHours` (number | null). GG-ops's strict schema ignores them on read
   and Mongoose's `$set`-only updates preserve them on write. Queries on them are always prefixed by
   `{ workspaceId, projectId, isArchived }`, which GG-ops already indexes. Upstreaming both fields into GG-ops's
   `Task` schema is the recommended follow-up.
4. **Rich text is read-safe.** GG-ops stores task descriptions and comment bodies as HTML from its editor. gg-pulse
   writes plain text and renders stored HTML as text (React escapes it), never with `dangerouslySetInnerHTML`.
5. **Ownership chains** are checked the same way as in GG-ops: user ∈ workspace (ACTIVE), project ∈ workspace,
   milestone ∈ project, assignee ∈ workspace.
6. **No transactions required.** Multi-document writes are ordered so a partial failure is recoverable (for example
   the owner membership is written right after the workspace and the workspace is deleted if it fails), because the
   local development MongoDB is a standalone server.

## gg-pulse-owned collections

Names chosen not to collide with any of GG-ops's 31 collections (notably GG-ops already has `jobs`,
`notifications`, `attachments`, `labels`, `goals`, `teams`):

`milestones`, `projectmemberships`, `auditevents`, `emailverifications`, `ratelimits`, and in later phases
`githubinstallations`, `repositories`, `repositorysyncstates`, `webhookevents`, `commits`, `pullrequests`,
`checkruns`, `breakages`, `codereviews`, `codereviewfindings`, `sonarsnapshots`, `generateddocuments`,
`documentversions`, `contributoridentities`, `tasklinks`, `jobruns`, `insights`, `reports` (see `DATA-MODEL.md`).

## Identity and sessions

- Same `users` documents, same bcrypt hashes: a GG-ops password works in gg-pulse and vice versa.
- Same Auth.js v5 JWT claims (`id`, `authVersion`). gg-pulse re-checks `isActive` and `authVersion` on every request,
  so a GG-ops password change or "sign out everywhere" (which bumps `authVersion`) also ends gg-pulse sessions.
- Sessions are per app (cookies are per origin). Single sign-on across the two would need a shared parent domain and
  cookie config; not built.
- `emailVerifiedAt` keeps GG-ops's three states: absent = legacy account (treated as verified), `null` = unverified,
  a date = verified. gg-pulse verifies with a 6-digit code; GG-ops with a link. Either sets the same field.

## Roles

| Prompt role | Stored as | Where |
|---|---|---|
| Owner | `MAINTAINER` | `workspacemembers.role` (GG-ops value) |
| Admin | `ADMIN` | `workspacemembers.role` |
| Member | `MEMBER` | `workspacemembers.role` |
| Viewer | `GUEST` | `workspacemembers.role` |
| Project Manager | `PROJECT_MANAGER` | `projectmemberships.role` (gg-pulse) |
| Reviewer | `REVIEWER` | `projectmemberships.role` (gg-pulse) |

GG-ops ignores `projectmemberships`, so a project manager in gg-pulse has ordinary workspace-role rights in GG-ops.

## Drift guard

`src/models/ggops-contract.test.ts` pins the shared enum values. When `GGOPS_APP_DIR` points at a GG-ops checkout
(e.g. `D:/Pratyush Tiwari/GG-ops/my-app`), it also reads GG-ops's own constants and model files and fails if the
values or shared field names differ. Run it after pulling GG-ops changes:

```bash
GGOPS_APP_DIR="D:/Pratyush Tiwari/GG-ops/my-app" npm test -- ggops-contract
```

## What is not integrated yet

- GG-ops `sections`, labels, custom fields, recurrence, follows and notifications are not read or written by gg-pulse.
  Tasks gg-pulse creates have `sectionId: null`; GG-ops shows them under "No section".
- `taskdependencies` will be shared when dependency management lands (Phase 4); GG-ops's `BLOCKS` type is the only
  type gg-pulse will write.
- No cross-app links in the UI yet (planned: "Open in GG-ops" on project and task pages when `GGOPS_URL` is set).
