# Stage 8: deployment and delivery preparation

Branch: `stage/8-deploy`, from accepted stage 7 on `main` (`e159824`).

## Confirmed requirements

- Use free hosting with an HTTPS address supplied by the platform; the owner has no domain.
- Preserve MySQL and the shared demonstration inventory. Keep registration open and keep demo seed data.
- Prepare deployment instructions, a from-scratch README self-check and a factual handoff for the reviewer.
- The project owner's self-check is not independent acceptance. The customer/reviewer owns final acceptance criteria.

## Hosting choice

The owner selected the free Render + Aiven path and created the accounts and MySQL service described below. The alternatives document the initial comparison.

Research checked on 2026-10-26 against the providers' official documentation:

| Option                         | Fit for this project                                                                                       | Material limits                                                                                                                                      |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Render Free + Aiven MySQL Free | Recommended candidate: one public Docker service for Next/Express and an external persistent MySQL service | Render has 512 MB RAM, shared monthly free hours and sleeps after 15 minutes idle; Aiven has 1 GB storage and may power down inactive free databases |
| Koyeb Free + Aiven MySQL Free  | Alternative Docker host with an HTTPS platform address                                                     | One free 512 MB instance; sleeps after one hour; account verification requires a payment card                                                        |
| Railway Free                   | Possible short evaluation, not the recommended baseline for the full continuously running stack            | Trial credit is temporary; the continuing free plan provides $1 monthly credit, not guaranteed always-on capacity for these services                 |

Free-tier limits are provider-controlled; this is a demo deployment, without an uptime guarantee. Hosted resource usage and behavior still require verification after deployment.

Account/access check on 2026-10-26: all 16 project branches were uploaded to [weeny-V/dzencode](https://github.com/weeny-V/dzencode). Render CLI 2.31.0 uses the owner-confirmed `My Workspace`. The deployed Free service is `dzencode` in Frankfurt, [public HTTPS URL](https://dzencode-vgev.onrender.com), backed by the owner's Aiven service `dzencode` in project `vladkruglovfencer-dbf9`. Direct CLI creation was used because Render resource tools were not exposed in this session.

Sources:

- [Render free services and limits](https://render.com/docs/free)
- [Render compute pricing](https://render.com/pricing)
- [Render platform domains and HTTPS](https://render.com/docs/web-services)
- [Render managed TLS](https://render.com/docs/tls)
- [Render WebSockets](https://render.com/docs/websocket)
- [Aiven MySQL free tier](https://aiven.io/docs/products/mysql/concepts/mysql-free-tier)
- [Aiven TLS and CA certificates](https://aiven.io/docs/platform/concepts/tls-ssl-certificates)
- [Aiven supported MySQL versions](https://aiven.io/docs/products/mysql/howto/manage-mysql-version)
- [Koyeb free instances](https://www.koyeb.com/docs/reference/instances)
- [Koyeb pricing and card verification](https://www.koyeb.com/docs/faqs/pricing)
- [Railway trial and continuing free credit](https://docs.railway.com/pricing/free-trial)

## Deployment design to validate

The current application requires its Next auth cookie to reach the Socket.io handshake. Two unrelated frontend/API hostnames do not meet this contract. Preserve one public HTTPS origin for pages, browser API requests and sockets, using a reverse proxy:

```text
Platform HTTPS address
  -> single public application container
       -> pages and Server Actions: Next.js
       -> /api/*: Express REST and GraphQL, with the prefix removed
       -> /socket.io/*: Express Socket.io, with WebSocket upgrade forwarding
  -> external Aiven MySQL over verified TLS
```

The prepared repository-root `Dockerfile` runs nginx, Next and Express with explicit supervision and bounded shutdown. The existing separate-service Compose setup remains available. `npm run test:deploy` exercised all 12 browser scenarios through the public proxy at a 512 MB cap; the recorded local cgroup peak was 280 MB. These local results do not establish hosted latency, capacity or HTTPS behavior.

Required preparation after the hosting choice:

1. Build a deployable image and platform configuration with exactly one public listener. Handle `PORT`, preserve Host/forwarded HTTPS headers and stream Server Component responses without proxy buffering. Configure the expected Server Action and Socket.io origin explicitly.
2. Separate the browser REST base path from the socket origin/path. Simply setting the current `apiUrl` to `/api` would make Socket.io use a namespace, not change its transport path. Keep private server-to-server API calls internal.
3. Use Secure HttpOnly auth cookies. Keep credentials, the JWT secret and database CA configuration outside Git and browser bundles.
4. Add MySQL TLS configuration with certificate and hostname verification. Confirm the available Aiven MySQL version and schema privileges; test the unchanged Liquibase changelog before relying on the hosted database. Do not disable certificate verification.
5. Apply only the application's schema and initial seed to the hosted database, not the integration-test schema. Free Render has no pre-deploy job/shell feature; document a deliberate local Liquibase invocation or another tested migration path. Do not put database credentials in image build arguments.
6. Reuse the same persistent JWT secret and database across redeploys. Migrations must not reset existing orders, products or user accounts; seed changeSets apply only once.
7. Test the public container under a 512 MB memory cap, including concurrent pages, auth, CSV and sockets. Record memory use and readiness/cold-start behavior. Fit on the actual provider remains unverified until deployed.
8. Verify database backup/export and restore instructions without resetting the public demo. A redeploy must preserve a record created before it.
9. Run the existing quality/integration/E2E checks, plus checks through the public proxy and later the actual HTTPS address. Check PWA, Secure cookies, streamed rendering and two-tab events after proxying.
10. Perform the from-scratch local README self-check in an isolated directory and Docker project. Record exact commands, results and any remaining prerequisites.

## Review and handoff

Use [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) to record evidence and the delivered address. It is a deployment/self-check record, not a claim that an independent tester has approved the work.

Completed evidence includes Aiven TLS/migrations, public HTTPS/browser checks, a control redeploy preserving records/authentication, owner-approved export/isolated recovery and clean README/Docker startup. See [deploy instructions](../deploy/README.md) and [current status](STAGE_8_STATUS.md). Deployment work stays on `stage/8-deploy`.

Deployment and operator self-check are complete with recorded limits: hosted resource graphs require paid compute, the real idle/wake cycle was not timed, and no optional map provider/off-device backup store was configured. Independent acceptance belongs to the reviewer. No merge into `main` is implied.
