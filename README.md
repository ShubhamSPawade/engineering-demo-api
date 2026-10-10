# Engineering Demo API

A small, stateless Node.js API for the engineering automation pilot. It has no npm dependencies and needs Node.js 24. Its built-in HTTP server and test runner keep the first pilot easy to execute.

## Run locally

From this folder:

```powershell
npm.cmd run check
npm.cmd test
npm.cmd run build
node scripts/smoke.mjs dist/src/server.mjs
npm.cmd start
```

Use `npm.cmd` on Windows when PowerShell blocks `npm.ps1`. On Linux/macOS, use `npm`.

The default address is `http://127.0.0.1:3000`. Stop the server with Ctrl+C.

| Endpoint | Example result |
| --- | --- |
| `GET /` | Service name and available endpoints |
| `GET /health` | `{"status":"ok","service":"engineering-demo-api"}` |
| `GET /version` | Component version, runtime environment, and commit identity |
| `GET /api/greeting?name=Shubham` | `{"message":"Hello, Shubham!"}` |

An omitted name defaults to World. Blank, repeated, overlong, or control-character names return 400. Unknown routes return 404; unsupported methods on known routes return 405.

## Runtime settings

Set `PORT` (default 3000), `HOST` (default loopback), `APP_ENV` (development/staging/production/test), and `APP_COMMIT` (default unknown) in the shell or hosting provider. The `.env.example` file documents these settings; it is not automatically loaded. Use `HOST=0.0.0.0` when your hosting platform requires external access.

## Container

```powershell
docker build --build-arg VCS_REF=local --tag engineering-demo-api:local .
docker run --rm --name engineering-demo-api -p 127.0.0.1:3000:3000 -e APP_ENV=development engineering-demo-api:local
```

The image runs as a non-root user, includes a health check, and builds/tests before copying runtime files into the final stage. The Node base tag currently tracks 24; pin an approved base-image digest when implementing immutable release candidates. Promote the resulting application image digest rather than rebuilding it between environments.

## Publish as the pilot application repository

This folder is staged inside the platform workspace for convenience. Publish only this folder into its own public `engineering-demo-api` repository; its `.github/workflows/ci.yml` must be at that repository's root to run.

From this folder, using your own terminal with GitHub access:

```powershell
git init -b main
git add .
git commit -m "feat: add demo API with tests and CI"
gh repo create ShubhamSPawade/engineering-demo-api --public --source . --remote origin --push
git switch -c dev
git push -u origin dev
git switch main
git switch -c staging
git push -u origin staging
git switch dev
```

Do not commit this nested repository into the platform repository. Set the application repository's default branch to dev when adopting the planned feature-branch flow.

## What the pilot exercises

`demo-verify` runs syntax checks, API/configuration tests, packaging, a real-process smoke check of the packaged runtime, and a Docker build. CI uses read-only permissions, timeouts, cancellation for superseded checks, and commit-pinned checkout/setup actions. Register `demo-verify` as a required check after its first successful run.

The workflow calls commit-pinned Node CI and security workflows from `ShubhamSPawade/engineering-platform`. Security checks include Gitleaks, OSV dependency inventory checks, and Semgrep. The required `demo-verify` gate succeeds only when both shared workflows succeed. Superthread ticket validation is also required. Advisory AI review is installed; image publishing and hosted deployment remain future integration steps.

## Superthread PR linking pilot

The pilot uses only the **Engineering Demo** board in the **test-demo** space. Its first integration card is [ST-1754: Test GitHub PR integration](https://app.superthread.com/cardtree/card-1754-test-github-pr-integration).

Include the card reference in the feature branch name and PR title, and put the full card URL in the PR description. For example, use `chore/ST-1754-test-github-pr-integration` and open the PR into `dev`. With the native GitHub integration connected, confirm that the card displays the PR link and status.

Passing GitHub checks verifies CI. Confirm the link in Superthread separately before declaring the integration successful. A merge into `dev` represents integration of the change; completion must wait for successful production deployment.

PRs into `dev`, `staging`, and `main` also use the trusted Superthread ticket policy. Include exactly one `ST-<card ID>` in the PR title and one matching full card URL in its description. The card must be active and belong to Engineering Demo in test-demo. The `superthread-ticket` status fails on missing or conflicting references, wrong membership, archived resources, or API errors. Editing PR metadata or pushing a new commit reruns validation. The credential is used only by pinned platform code, which never checks out application PR code.

Cards must also contain exactly one non-empty **Acceptance criteria** section and one non-empty **Test plan** section in their description. Markdown headings and standalone labels in plain text or HTML are supported. Blank markup and placeholder-only sections do not pass. This verifies structural readiness; fulfillment of the criteria still needs tests and review. Scheduled ticket reconciliation rechecks open PRs against card changes without requiring a code commit.

The scoped audit verified both required sections on ST-1754 before this policy was adopted. At validation time, the required check verifies scope and section readiness together. A successful result does not prove the criteria have been fulfilled or that the application has reached production; completion remains a separate deployment milestone.

The required ticket check also rejects cancelled cards and unresolved native blocked-by dependencies. Prerequisites must be completed, accessible and unarchived in the registered demo scope. Open PRs are scheduled for revalidation every 15 minutes; GitHub can delay scheduled runs. For an immediate recheck, run `gh workflow run superthread-ticket.yml --repo ShubhamSPawade/engineering-demo-api --ref dev`. See [the reconciliation policy and limits](https://github.com/ShubhamSPawade/engineering-platform/blob/948f775cdc1b9c8db6aa10e6a0d495c16f75fc46/docs/superthread-reconciliation.md).

## Advisory AI review

PR-Agent reviews text patches with Gemini and posts one advisory comment. The model job executes approved reviewer code and receives no GitHub or Superthread token. A separate publisher checks the PR commit before updating the comment. It does not apply suggestions, approve, merge, deploy, or complete cards.

The configured model is Gemini 3.1 Flash-Lite, selected after Gemini 3.8 Flash inference timeouts. The existing Gemini API key is reused. Free-tier availability depends on the project's access and quota; a model metadata response alone is insufficient to declare review readiness.

Check AI findings against the actual code and tests. Missing credentials, free-tier quota limits, unsupported input or inference failures produce an unavailable result; required CI, security and ticket checks still determine merge eligibility. The pilot reviews at most 40 files and 50,000 diff bytes, and discloses omitted files without text patches. It has no automated access to card acceptance criteria yet.

When a review is unavailable, inspect the Advisory AI Review run for its safe failure category or provider HTTP status. Correct provider access or wait for free quota to recover, then rerun the workflow while the same PR commit remains open. Keep billing disabled. A new commit automatically starts a fresh review; results for an older commit are not published onto the newer one.

Operators can temporarily enable the repository variable `PR_AGENT_DIAGNOSE_PROVIDER=true` to distinguish reviewer transport failures from provider inference failures. After a failed review it makes one bounded diagnostic request containing no PR data; restore the variable to false after the test. Model metadata access alone does not prove that inference works.

For an initial test PR, branch from dev, change the greeting default and its test together, and open a PR into dev. To verify a failing check blocks merges, temporarily change behavior without updating the test in a separate sandbox PR.

References: [Node test runner](https://nodejs.org/docs/latest-v24.x/api/test.html), [checkout release](https://github.com/actions/checkout/releases/tag/v7.0.1), [setup-node release](https://github.com/actions/setup-node/releases/tag/v7.1.0).
