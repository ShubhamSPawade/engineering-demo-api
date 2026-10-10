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

The workflow calls commit-pinned Node CI and security workflows from `ShubhamSPawade/engineering-platform`. Security checks include Gitleaks, OSV dependency inventory checks, and Semgrep. The required `demo-verify` gate succeeds only when both shared workflows succeed. Superthread validation, AI review, image publishing, and hosted deployment are future integration steps.

## Superthread PR linking pilot

The pilot uses only the **Engineering Demo** board in the **test-demo** space. Its first integration card is [ST-1754: Test GitHub PR integration](https://app.superthread.com/cardtree/card-1754-test-github-pr-integration).

Include the card reference in the feature branch name and PR title, and put the full card URL in the PR description. For example, use `chore/ST-1754-test-github-pr-integration` and open the PR into `dev`. With the native GitHub integration connected, confirm that the card displays the PR link and status.

Passing GitHub checks verifies CI. Confirm the link in Superthread separately before declaring the integration successful. A merge into `dev` represents integration of the change; completion must wait for successful production deployment.

For an initial test PR, branch from dev, change the greeting default and its test together, and open a PR into dev. To verify a failing check blocks merges, temporarily change behavior without updating the test in a separate sandbox PR.

References: [Node test runner](https://nodejs.org/docs/latest-v24.x/api/test.html), [checkout release](https://github.com/actions/checkout/releases/tag/v7.0.1), [setup-node release](https://github.com/actions/setup-node/releases/tag/v7.1.0).
