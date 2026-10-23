# Data model

MongoDB is the source of truth. One Mongoose model per collection in `src/models/`. Every tenant-scoped document
carries `workspaceId`, every schema has `{ timestamps: true }` (UTC `createdAt`/`updatedAt`), and every query on
tenant data includes `workspaceId` (rule inherited from GG-ops). Collections marked **shared** follow GG-ops's
contract exactly (`INTEGRATION-GG-OPS.md`).

Legend: ✅ implemented in this repository · 🗓 designed, lands in the named phase.

## Identity and access

### `users` — shared ✅ `src/models/User.ts`
| Field | Type | Notes |
|---|---|---|
| name | string, required | |
| email | string, required, **unique**, lowercased | login identifier |
| image | string \| null | avatar URL from OAuth |
| passwordHash | string \| null | bcrypt (cost 10); null for OAuth-only accounts |
| emailVerifiedAt | Date \| null \| absent | absent = legacy verified, null = unverified, Date = verified |
| authVersion | number, default 0 | bump to revoke every session |
| jobTitle | string \| null | onboarding "What is your role?" |
| isActive | boolean, default true | false blocks sign-in and sessions |
| …GG-ops profile fields | | timezone, department, bio, out-of-office (declared, unused by gg-pulse) |

Access: a user reads and edits only their own document. Deletion: account deletion anonymises name/email and sets
`isActive: false` (🗓 Phase 6), because tasks and activity reference the id.

### `workspaces` — shared ✅
`name`, `slug` (**unique**, lowercased), `description`, `logoUrl`, `ownerId`. Index: `ownerId`.
Access: members read; ADMIN+ rename; MAINTAINER deletes (🗓).

### `workspacemembers` — shared ✅
`workspaceId`, `userId`, `role` (`MAINTAINER|ADMIN|MEMBER|GUEST`), `status` (`ACTIVE|INVITED|REMOVED`),
`invitedBy`, `joinedAt`. Indexes: `{workspaceId, userId}` **unique**, `{workspaceId, role}`, `userId`.
Membership is the tenant boundary: every request resolves `(session user, workspace slug)` to an ACTIVE membership.
Removal sets `status: "REMOVED"` (keeps history; re-invite reactivates).

### `workspaceinvites` — shared ✅
`workspaceId`, `email`, `role` (`ADMIN|MEMBER|GUEST`), `invitedBy`, `token` (**unique**, 32 random bytes,
base64url), `expiresAt` (7 days), `acceptedAt`. Index `{workspaceId, email}`.
The token is stored in plain text because GG-ops reads it that way; hashing it is an upstream follow-up
(`SECURITY.md`).

### `projectmemberships` — gg-pulse ✅ `src/models/ProjectMembership.ts`
`workspaceId`, `projectId`, `userId`, `role` (`PROJECT_MANAGER|REVIEWER`), `createdBy`.
Indexes: `{projectId, userId}` **unique**, `{workspaceId, userId}`.
Project roles only *add* rights on one project (see `SECURITY.md` §Authorization). The project creator becomes its
project manager.

### `auditevents` — gg-pulse ✅ `src/models/AuditEvent.ts`
`workspaceId` (null for account-level events), `actorId`, `action` (e.g. `member.role_changed`), `targetType`,
`targetId`, `metadata` (small object, no secrets), `createdAt`.
Indexes: `{workspaceId, createdAt: -1}`; TTL on `createdAt` = 730 days (retention).
Written for consequential actions only: workspace created/renamed, invite created/accepted, role changed, member
removed, project archived, project role changed. Readable by ADMIN+.

### `emailverifications` — gg-pulse ✅
`userId` (**unique**: one live code per user), `codeHash` (HMAC-SHA256 of the code keyed by `AUTH_SECRET`),
`attempts`, `expiresAt` (TTL index, 15 minutes). Deleted on success; 5 wrong attempts burn the code.

### `ratelimits` — gg-pulse ✅
`_id` = `<key>:<window number>`, `count`, `expiresAt` (TTL). Fixed-window counters for sign-in, sign-up and code
resend. Works on serverless without Redis; swap for Redis when the worker stack lands.

## Project management

### `projects` — shared ✅
`workspaceId`, `name`, `key`, `description`, `color`, `icon`, `createdBy`, `archivedAt`,
`statusColor` (`ON_TRACK|AT_RISK|OFF_TRACK|ON_HOLD`), `statusNote`, `statusUpdatedAt`.
Indexes: `{workspaceId, archivedAt}`, `{workspaceId, name}`.

### `milestones` — gg-pulse ✅ `src/models/Milestone.ts`
`workspaceId`, `projectId`, `name`, `description`, `startDate`, `dueDate`, `status`
(`PLANNED|ACTIVE|DONE|CANCELLED`), `createdBy`.
Index: `{workspaceId, projectId, dueDate}`. Progress is derived from tasks, never stored.

### `tasks` — shared ✅ (+ two gg-pulse extension fields)
GG-ops fields: `workspaceId`, `projectId`, `sectionId`, `parentTaskId`, `title`, `description`, `status`
(`TODO|IN_PROGRESS|DONE|BLOCKED`), `priority` (`LOW|MEDIUM|HIGH|URGENT`), `type`
(`TASK|BUG|FEATURE|CHORE|MILESTONE`), `assigneeIds[]`, `labelIds[]`, `dueDate`, `startDate`, `completedAt`,
`createdBy`, `updatedBy`, `isArchived`, `position`, `recurrenceRule`, `recurrenceParentId`.
Extension: `milestoneId` (ObjectId \| null), `estimateHours` (0–1000 \| null).
Indexes (GG-ops's, unchanged): `{projectId, sectionId, position}`, `{workspaceId, assigneeIds, dueDate}`,
`{workspaceId, projectId, isArchived}`, `{parentTaskId}`, text `{workspaceId, title, description}`,
`{workspaceId, recurrenceRule}`, `{workspaceId, assigneeIds, isArchived, dueDate, updatedAt}`,
`{workspaceId, isArchived, status, dueDate, projectId}`.
`assigneeIds` is a bounded array (validated ≤ 10) — intentional, as in GG-ops.

### `comments` — shared ✅
`workspaceId`, `projectId`, `taskId`, `authorId`, `body`, `mentionedUserIds[]`, `parentCommentId`, `deletedAt`.
Indexes: `{taskId, createdAt}`, `{workspaceId, authorId}`.

### `activitylogs` — shared ✅
`workspaceId`, `projectId`, `taskId`, `actorId`, `entityType` (`TASK|PROJECT|COMMENT|SECTION|WORKSPACE`),
`entityId`, `action` (e.g. `TASK_CREATED`, `TASK_STATUS_CHANGED`), `metadata`.
Indexes: `{taskId, createdAt: -1}`, `{workspaceId, createdAt: -1}`, `{projectId, createdAt: -1}`.
Product timeline (what changed on a task). Security-relevant events go to `auditevents` instead.

### Planned PM collections 🗓
| Collection | Phase | Shape (summary) |
|---|---|---|
| `taskdependencies` (shared, GG-ops) | 4 | `workspaceId, fromTaskId, toTaskId, type: BLOCKS`; unique triple. Cycle prevention in the service. |
| `tasklinks` | 3 | `workspaceId, taskId, repositoryId, kind (PULL_REQUEST\|COMMIT\|BRANCH), externalId`; unique per task+target. |
| `reviewrequests`, `approvals` | 2b | `workspaceId, taskId, requestedBy, reviewerId, state, decidedAt`. |
| `workcapacity` | 4 | `workspaceId, userId, weekStart, hoursAvailable`; unique per user-week. |
| `projecthealthsnapshots` | 4 | `workspaceId, projectId, takenAt, level, signals[], confidence` (see `PROJECT-HEALTH-MODEL.md`). |
| `contributionsnapshots` | 5 | `workspaceId, userId, period, evidence counts` (see `CONTRIBUTION-MODEL.md`). |

## Engineering intelligence (Phase 3) 🗓

| Collection | Key fields | Unique / indexes | Replaces legacy |
|---|---|---|---|
| `githubinstallations` | `workspaceId, installationId, accountLogin, accountType, suspendedAt` | `installationId` unique | `GITHUB_APP_*` single org |
| `repositories` | `workspaceId, installationId, providerId, fullName, defaultBranch, visibility, syncPaused` | `{workspaceId, providerId}` unique | `REPOS` list / `extra_repos` |
| `repositorysyncstates` | `repositoryId, lastFetchedAt, lastHeadSha, cursors{}, lastError, attempts` | `repositoryId` unique | `settings` keys `head:*`, `*_since:*` |
| `webhookevents` | `deliveryId, event, action, repositoryId, receivedAt, processedAt, status` | `deliveryId` unique; TTL 30 d | — (new: dedupe) |
| `commits` | `workspaceId, repositoryId, sha, authorIdentityId, committedAt, message, additions, deletions, files, isMerge, onDefault` | `{repositoryId, sha}` unique | `commits` |
| `pushes` | `workspaceId, repositoryId, branch, before, after, pusherLogin, pushedAt, forced, commitShas[≤250], source` | `{repositoryId, branch, before, after}` unique | `pushes` + `push_commits` |
| `pullrequests` | `workspaceId, repositoryId, number, title, authorLogin, state, draft, base, head, headSha, createdAt, mergedAt` | `{repositoryId, number}` unique | `pulls` |
| `checkruns` | `repositoryId, sha, name, conclusion, completedAt, url` | `{repositoryId, sha, name}` unique | `checks` |
| `breakages` | `repositoryId, branch, checkName, brokenSha, lastGoodSha, authorIdentityId, pusherLogin, brokenAt, fixedSha, fixedAt` | `{repositoryId, branch, checkName, brokenSha}` unique | `breakages` |
| `codereviews` | `repositoryId, pr, branch, baseSha, headSha, model, summary, status, postedUrl` | `{repositoryId, pr, branch, headSha}` unique | `reviews` |
| `codereviewfindings` | `reviewId, path, line, severity, category, confidence (CONFIRMED\|TENTATIVE), title, body, blameSha, authorIdentityId, fingerprint` | `{reviewId, fingerprint}` unique | `findings` |
| `sonarsnapshots` | `repositoryId, takenOn, authorEmail, quality, count` | unique on all but count | `sonar_issues` |
| `generateddocuments` | `repositoryId, slug, kind, title, summary, content, inputsFingerprint, headSha, model, status` | `{repositoryId, slug}` unique | `docs` |
| `documentversions` | `documentId, headSha, contentRef (inline ≤ 256 KB or object-storage key), generatedAt` | `{documentId, createdAt}` | `doc_versions` |
| `contributoridentities` | `workspaceId, email, githubLogin, userId?` | `{workspaceId, email}` unique | `identities` |
| `jobruns` | `queue, jobId, name, workspaceId, status, attempts, startedAt, finishedAt, error` | `{queue, jobId}` unique; TTL 30 d | `events` |
| `insights`, `reports`, `aijobs` | provenance (`sources[]` of collection+id+revision), `kind`, `confidence` | `{workspaceId, createdAt}` | — |

Diffs, archives and diagrams are never stored whole in a document; large artifacts go to object storage and the
document keeps a key.

## Query patterns (this slice)

| Screen | Query | Index used |
|---|---|---|
| Resolve workspace | `workspaces.findOne({slug})` + `workspacemembers.find({userId, status: ACTIVE})` | `slug` unique, `userId` |
| Project list | `projects.find({workspaceId, archivedAt: null})` | `{workspaceId, archivedAt}` |
| Board / list | `tasks.find({workspaceId, projectId, isArchived: false})` | `{workspaceId, projectId, isArchived}` |
| My tasks | `tasks.find({workspaceId, assigneeIds: me, isArchived: false}).sort({dueDate, updatedAt})` | 5-field my-tasks index |
| Overview counts | `tasks.countDocuments({workspaceId, isArchived: false, status, dueDate})` | `{workspaceId, isArchived, status, dueDate, projectId}` |
| Milestones | `milestones.find({workspaceId, projectId}).sort({dueDate})` | `{workspaceId, projectId, dueDate}` |
| Task activity | `activitylogs.find({taskId}).sort({createdAt: -1})` | `{taskId, createdAt}` |

Large lists page with cursors on `(createdAt, _id)` when they outgrow a single page (🗓 with the engineering
collections; current PM lists are per project and bounded by project size).

## Retention and deletion

| Data | Retention |
|---|---|
| `auditevents` | 730 days (TTL) |
| `emailverifications` | 15 minutes (TTL) |
| `ratelimits` | window length (TTL) |
| `webhookevents`, `jobruns` | 30 days (TTL) 🗓 |
| Projects | archived, not deleted (`archivedAt`); hard delete with tasks is an Admin action 🗓 |
| Workspace deletion | 🗓 Phase 6: soft-delete, 30-day grace, then a worker job deletes every collection by `workspaceId` |
