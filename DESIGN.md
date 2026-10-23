# gg-pulse — design

gg-pulse is the TypeScript rewrite of the gg-docs engineering portal, extended into one place where a team plans
work and sees how its engineering actually moves. It shares people, workspaces, projects and tasks with GG-ops
(`docs/INTEGRATION-GG-OPS.md`).

## Product vision

A project manager opens a milestone, sees the task that is late, the pull request behind it that is blocked on a
failing check, who owns it and how loaded they are, and reads a short explanation that cites the records it came
from. An engineer sees the same picture from the code side.

Two capabilities, connected:

- **Engineering intelligence** — repositories, commits, pull requests, CI, breakages, code review findings,
  generated architecture and documentation, quality signals.
- **Project intelligence** — projects, milestones, tasks, dependencies, workload, contribution evidence, delivery
  risk.

## Goals and measurable objectives

| Goal | Measure |
|---|---|
| Replace the legacy portal without losing capability | Every row in `docs/MIGRATION.md` §7 is ✅ and accepted |
| Secure multi-tenancy | 0 cross-workspace reads/writes in the isolation test suite; every service entry point takes an authorized scope |
| Simple to operate | A new user goes from sign-up to a first task in a project in under 2 minutes (UX flow in `docs/UX-FLOWS.md`) |
| Durable background work (Phase 3+) | A worker crash mid-sync loses no webhook and duplicates no record (retry tests) |
| Explainable analytics (Phase 4+) | Every metric and insight has a documented formula, data source, period and freshness; every AI insight cites sources |
| Works without GitHub | All PM flows pass with no GitHub integration configured |

## Scope

In: authentication and onboarding; workspaces, membership, invitations, roles; projects, milestones, tasks,
comments, activity; dependencies and delay analysis; workload and capacity; contribution evidence; GitHub App
repository sync; PR/CI/breakage analytics; AI code review; generated documentation; SonarQube; AI Q&A and summaries;
read-only MCP; audit and job status.

## Non-goals

No ERP: no payroll, attendance, leave, inventory, procurement, accounting or HR management. No opaque productivity
scores, no ranking of people by commits or lines. No automatic task reassignment from model output. No second task
system next to GG-ops's.

## Modules and acceptance criteria

| Module | Acceptance | Phase | State |
|---|---|---|---|
| Auth & onboarding | Sign up with email + password, verify by 6-digit code, set name and role, create a workspace; sign in with credentials, Google or GitHub when configured; sessions revoked by `authVersion` | 1 | ✅ |
| Workspaces & membership | Create and switch workspaces; invite by link (+ email when configured); accept; change role; remove; every page and action resolves the caller's ACTIVE membership server-side | 1 | ✅ |
| Authorization | One policy table (`src/modules/workspaces/policy.ts`), unit-tested for every role × capability | 1 | ✅ |
| Audit | Consequential actions recorded in `auditevents`, visible to admins | 1 | ✅ |
| Projects | Create, edit, archive; project manager and reviewer roles | 2 | ✅ |
| Milestones | Create with due date, change status, derived progress, tasks attached | 2 | ✅ |
| Tasks | Create; edit status, priority, assignees, due date, estimate, milestone; board and list views; my tasks; comments; activity | 2 | ✅ |
| Reviews & approvals | Request review on a task, approve/reject | 2b | 🗓 |
| GitHub & repositories | App install per workspace, repo selection, durable sync with retries, webhook dedupe, pause/resume/resync/disconnect | 3 | 🗓 |
| Engineering analytics | Activity, PR throughput and review latency, CI trends, breakages — each metric documented | 3 | 🗓 |
| Docs & architecture | Ported docgen pipeline with fingerprints and history | 3 | 🗓 |
| Code review & Sonar | Ported review pipeline, validated findings, confirmed vs tentative | 3 | 🗓 |
| Dependencies & delay | Cycle-free dependency graph, blocked detection, delay propagation with stated assumptions | 4 | 🗓 |
| Workload & health | Capacity vs assigned estimates, redistribution suggestions with evidence, project health | 4 | 🗓 |
| Contribution & AI | Evidence-based contribution summaries, cited AI insights, scoped Q&A, read-only MCP | 5 | 🗓 |
| Hardening | Backups, restore drill, alerts, deletion workflows, load tests | 6 | 🗓 |

## Target architecture (summary)

Modular monolith in Next.js (App Router, Server Components first, Server Actions for mutations) + a separately
deployed TypeScript worker (BullMQ on Redis) for git, sync, AI and generation jobs + MongoDB Atlas + optional object
storage. Detail: `docs/ARCHITECTURE.md`.

```
Browser ─▶ Next.js (Vercel) ─▶ modules/*/service (authz + rules) ─▶ MongoDB Atlas  ◀─ shared with GG-ops
              │  enqueue                                             ▲
              ▼                                                      │
            Redis ─▶ worker (VPS: git, LLM, docgen, Sonar) ──────────┘
```

## Security principles

1. Authorization on the server, close to the data: every service function takes a scope resolved from the session,
   never a client-supplied workspace id.
2. Ownership chains on every mutation (user ∈ workspace, project ∈ workspace, milestone ∈ project, assignee ∈ workspace).
3. Validate every boundary with Zod; return DTOs, never raw documents.
4. Repository content, PR text and model output are untrusted data.
5. Secrets only from validated env (and, Phase 3, encrypted per-workspace integration secrets).
6. Record consequential actions in the audit log.

Detail: `docs/SECURITY.md`.

## Implementation roadmap

| Phase | Content | Exit gate |
|---|---|---|
| 0 Discovery | Audit, matrix, data model, migration plan, integration contract | ✅ Docs in `docs/`; no undocumented destructive assumption |
| 1 Foundation | Next.js + shadcn design system, env, Mongo, Auth.js, workspaces, membership, policy, audit, onboarding, dashboard, tests | ✅ A user can authenticate, create a workspace, navigate, and reach only their workspaces (isolation tests pass) |
| 2 Project management | Projects, milestones, tasks, comments, activity, board/list, project roles; then reviews/approvals | Core slice ✅; reviews/approvals 🗓 |
| 3 Engineering intelligence | Worker + queue, GitHub App, sync, PR/CI/breakages, analytics, docs, review bot, Sonar | Processing is repeatable, recoverable, observable |
| 4 Dependency & workload | Dependencies, cycles, blocked, delay propagation, capacity, health | Deterministic calculations validated on realistic fixtures |
| 5 Contribution & AI | Contribution evidence, summaries, risk explanations, Q&A, review, MCP | Insights are scoped, cited, explicit about uncertainty |
| 6 Hardening | Load, backup/restore, security review, alerts, retention | Recovery procedures documented and rehearsed |

Current state and the next concrete tasks: `docs/STATUS.md`.

## Definition of done (per feature)

- Business rules in a service module, not in a route or component; inputs validated with Zod.
- Authorization through the policy table; tenant isolation covered by an integration test when the feature reads or
  writes tenant data.
- Loading, empty, error and permission-denied states designed (`docs/SCREEN-INVENTORY.md`).
- `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` pass.
- Docs updated in the same change; paths referenced in docs exist.
