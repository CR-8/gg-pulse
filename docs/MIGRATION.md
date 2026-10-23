# Migration from the legacy portal

Legacy: FastAPI + SQLite + Astro (`CR-8/gg-docs`, audited in `LEGACY-AUDIT.md`). Target: this repository.
The legacy app is **not deleted** and keeps running unchanged until every capability below is marked replaced and
accepted.

## 1. Decision on historical SQLite data

Most legacy data is a cache of GitHub and git and is cheaper and more correct to rebuild with a fresh sync than to
convert. Only data that cannot be re-derived, or is expensive to re-create, is imported.

| Legacy table                       | Re-derivable?                                           | Decision                                                                                                                                                                                                                    |
| ---------------------------------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `commits`                          | yes (`git log`, 90-day backfill)                        | **Rebuild** by the Phase 3 sync                                                                                                                                                                                             |
| `identities`                       | yes (GitHub commits API, webhooks)                      | **Import** (cheap, speeds up attribution), then keep learning                                                                                                                                                               |
| `pushes`, `push_commits`           | **no** — the Events API only reaches ~300 events back   | **Import**                                                                                                                                                                                                                  |
| `pulls`                            | yes (open + recent closed)                              | **Rebuild**                                                                                                                                                                                                                 |
| `checks`                           | partly (old check runs expire)                          | **Import** last 90 days                                                                                                                                                                                                     |
| `breakages`                        | partly (depends on `checks`)                            | **Import**                                                                                                                                                                                                                  |
| `reviews`, `findings`              | no (LLM output, costs money and model versions changed) | **Import**                                                                                                                                                                                                                  |
| `sonar_issues`                     | no (daily snapshots)                                    | **Import**                                                                                                                                                                                                                  |
| `docs`, `doc_versions`, `docs_fts` | current docs yes, history no                            | **Import** `doc_versions` as history; regenerate current docs; FTS rebuilt from target index                                                                                                                                |
| `events`                           | operational log                                         | **Discard**                                                                                                                                                                                                                 |
| `settings`                         | contains plaintext LLM keys and Sonar token             | **Do not migrate secrets.** Admins re-enter them in gg-pulse (stored encrypted, `SECURITY.md`). Non-secret values (model, base URL, post-reviews flag, extra repos) are imported into the workspace's integration settings. |

Nothing to migrate for people: the legacy app had no user accounts (GitHub logins or two shared passwords). Users
sign up in gg-pulse, or already exist if gg-pulse shares GG-ops's database.

## 2. Mapping

| Legacy                           | Target collection                                                             | Natural key used for idempotent upsert                                                                     |
| -------------------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `"owner/name"` repo string       | `repositories`                                                                | `(workspaceId, providerId)`; `providerId` is GitHub's numeric repo id, resolved once via the API at import |
| `identities(email, login, name)` | `contributoridentities`                                                       | `(workspaceId, email)`                                                                                     |
| `pushes` + `push_commits`        | `pushes` (`commitShas` ≤ 250, as legacy)                                      | `(repositoryId, branch, before, after)`                                                                    |
| `checks`                         | `checkruns`                                                                   | `(repositoryId, sha, name)`                                                                                |
| `breakages`                      | `breakages`                                                                   | `(repositoryId, branch, checkName, brokenSha)`                                                             |
| `reviews`                        | `codereviews`                                                                 | `(repositoryId, pr, branch, headSha)`                                                                      |
| `findings`                       | `codereviewfindings` (`confidence: "TENTATIVE"` — legacy did not distinguish) | `(reviewId, fingerprint)`, fingerprint = SHA-256 of `path:line:title`                                      |
| `sonar_issues`                   | `sonarsnapshots`                                                              | `(repositoryId, takenOn, authorEmail, quality)`                                                            |
| `doc_versions`                   | `documentversions`                                                            | `(documentId, headSha, generatedAt)`                                                                       |

`person` columns (login-or-email) become `authorIdentityId` references through `contributoridentities`.
Timestamps are ISO-8601 strings in SQLite; they are parsed as UTC and rows with unparseable dates are reported, not
guessed.

Records that cannot be migrated losslessly:

- `findings.person` resolved through an identity that no longer maps → kept as the raw email in `authorEmail`.
- `docs_fts` (derived index) → rebuilt.
- Legacy repos whose GitHub id cannot be resolved (deleted or no longer visible to the App) → skipped and listed.

## 3. Import tool (Phase 3, with the target collections)

`scripts/import-legacy.ts` (not written yet — it needs the Phase 3 models):

- Reads `portal.db` read-only with Node's built-in `node:sqlite` (no new dependency); never writes to it.
- `--workspace <slug>` (required), `--dry-run` (default **on**; `--apply` to write), `--only <table,…>`.
- Upserts by the natural keys above, so re-running is a no-op; prints per-table counts: read / inserted / matched /
  skipped (with reasons).
- Validation pass after `--apply`: row counts per table vs. target, every `codereviewfindings.reviewId` resolves,
  every `breakages.repositoryId` resolves, min/max timestamps per table match, and per-repository totals of
  findings by severity match the legacy `GROUP BY`.
- Writes a Markdown report to `migration-report-<timestamp>.md` with warnings and the reconciliation table.

## 4. Re-establishing integrations

1. GitHub App: reuse the existing App (same App id and private key) or create a new one. Point its webhook URL at
   `<gg-pulse>/api/webhooks/github` and its Setup URL at `<gg-pulse>/w/<slug>/settings/integrations`. Installing it
   from gg-pulse creates the `githubinstallations` record for the workspace. Repository access then comes from the
   installation, not from `GITHUB_TOKEN`.
2. Sign-in with GitHub is a separate OAuth app (Auth.js provider, `AUTH_GITHUB_ID/SECRET`), deliberately not the
   GitHub App's user-authorization flow the legacy app used.
3. SonarQube: the existing server keeps running; an admin enters its URL and token in integration settings.
4. LLM: admins re-enter provider, model and key.
5. MCP clients: re-connect with per-user credentials; the shared `MCP_TOKEN` is retired.

## 5. Cutover checklist

1. Phase 3 accepted: sync, PRs, checks, breakages, reviews and docs work for the pilot workspace.
2. Back up `portal.db` (`sqlite3 portal.db ".backup portal-<date>.db"`) and keep it for 90 days.
3. `import-legacy --dry-run`, review the report, then `--apply`; reconcile.
4. Switch the GitHub App webhook URL to gg-pulse. Leave the legacy poller running in read-only use for one week to
   compare breakage and review results side by side.
5. Announce the new URL; disable legacy reviews posting (`post_reviews = false`) so PRs are not reviewed twice.
6. After a week without discrepancies: stop the legacy stack; keep its volume and the SQLite backup.

## 6. Rollback

The import never modifies `portal.db`, and the legacy stack is untouched until step 6. Rolling back is: point the
GitHub App webhook URL back to the legacy `/webhook/github`, re-enable `post_reviews` there, and stop gg-pulse's
worker. Data written to gg-pulse in the meantime remains in MongoDB for a later retry.

## 7. Status

| Capability                                      | Replaced?                                                                                             |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Login                                           | ✅ per-user accounts (credentials, optional Google/GitHub) — replaces shared passwords and `DEV_USER` |
| Workspaces, members, roles                      | ✅ new (legacy had none)                                                                              |
| Projects, milestones, tasks, comments, activity | ✅ new, GG-ops-compatible                                                                             |
| Sync, PRs, checks, breakages                    | 🗓 Phase 3                                                                                             |
| Reviews, docs, Sonar, Ask, MCP                  | 🗓 Phases 3 and 5                                                                                      |
| People metrics                                  | 🗓 Phase 5, redesigned (`CONTRIBUTION-MODEL.md`)                                                       |
