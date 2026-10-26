# Stage 8 status

Branch: `stage/8-deploy`. Hosting: Render Free with external Aiven MySQL Free. Setup and secret locations are in [deploy/README.md](../deploy/README.md).

## Prepared locally

- One public unprivileged Docker container with nginx, Next and Express. Browser REST uses `/api`; Socket.io uses the page origin and its existing path. Private API requests stay on loopback.
- MySQL TLS verifies both CA and server hostname. CA can come from PEM environment content or a file. The Blueprint explicitly enables TLS.
- A supervisor starts the proxy after both listeners respond, stops remaining children on a process failure and forwards shutdown signals.
- `render.yaml` uses the Free plan and runtime secrets, with automatic deploys disabled. A one-shot Liquibase helper applies application schema/seed using a verified TLS Java truststore.
- Local credentials/certificates are ignored by Git and excluded from image builds. No hosted credentials or values were committed.

## Verified on 2026-10-26

| Check                                   | Result                                                                                                      |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `npm run check`                         | pass: formatting, lint, types, 201 server tests, 544 client tests, 11 runner/deployment configuration tests |
| Combined production Docker build/start  | pass after fixing nginx's non-root temporary directories                                                    |
| `npm run test:deploy`                   | 12 Chromium scenarios pass through the combined proxy; local HTTP only                                      |
| Cgroup memory under that browser suite  | peak 280 MiB, limit 512 MiB                                                                                 |
| Blueprint official JSON Schema          | pass                                                                                                        |
| Render CLI 2.31.0 `blueprints validate` | `valid: true`, one planned service `dzencode`                                                               |
| Render account/workspace                | browser login succeeded; owner selected `My Workspace`; no existing services                                |
| Liquibase helper                        | shell syntax checked; keytool available in the Liquibase image                                              |

The combined suite covers authentication, tab logout, forms/search/filter/deletion, language/drafts, charts/graph, fixture map, real CSV worker downloads, PWA/offline, events and reconnect. A failing initial nginx start stopped the remaining processes and the runner removed the disposable environment. This is local evidence, not a live deployment result.

The separate API/Next regression run also passed: 8 files / 102 integration tests and 12 Chromium scenarios. Ignored logs: `test-results/stage8-check.log`, `test-results/stage8-proxy.log`, `test-results/stage8-system.log`. Test containers/volumes were removed and pre-existing Docker projects were preserved.

## Remaining work

- Aiven Running state, connection settings and CA; remote schema/seed migration and verified TLS connectivity.
- Render deployment and actual HTTPS address; Secure cookies, origin handling and service-worker verification over HTTPS.
- Persistence across a hosted redeploy, export/restore rehearsal against an isolated target and a from-scratch README self-check.
- Optional map provider setup with its attribution/usage conditions.
- Final observations in [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md).

The hosted service has not been created. Stage 8 is incomplete. No merge into main has been performed.
