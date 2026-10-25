# Stage 6c implementation and owner review

Stage 6c is implemented on `stage/6c-auth` in its separate worktree, based on accepted stage 6b commit c6170a3. After the implementation, verification and review fixes, the owner approved committing the completed stage and merging it into main. The contract and deployment limits are in [ADR 0002](adr/0002-authentication.md).

## Delivered scope

- [x] Liquibase users and persistent revocable sessions; factory-composed auth/users modules; atomic registration, unique normalized email, salted scrypt, generic login failures and bounded throttling.
- [x] JWT without automatic expiry/refresh; REST authorization on all inventory reads/writes and participants; logout revokes only the current session.
- [x] Localized login/register with a minimal logo/language shell, EN default and explicit EN/RU choice, automatic login on registration, safe local return paths and no credential drafts.
- [x] Server-only token transport and one-year host-only HttpOnly/SameSite=Lax cookie; explicit local HTTP and HTTPS Secure configuration.
- [x] Protected inventory, forms, Users, Groups and Settings; public login/register/health; deliberate authentication handling in reads and actions.
- [x] Active-session verification before warmed Next cache hits, non-credential user/session cache keys, cookie-free cache callbacks, preserved tags/invalidation.
- [x] Users current-user card with own email and participant list with public names/registration dates only.
- [x] Seven-day drafts scoped by user and existing form/order context, no anonymous adoption, preserved revision/dirty-field protections and owner recovery.
- [x] Session changes reset Redux/forms/dialogs and close old sockets; stale UI submissions carry expected session ids; late results cannot navigate or modify a newer session.
- [x] Credential-free BroadcastChannel/storage notifications and focus/visibility/restored-page recovery; unavailable session checks do not claim logout.
- [x] Cross-tab serialization of cookie-changing requests through Web Locks, or an empty IndexedDB transaction on ordinary HTTP; successful mutations notify even after their form unmounts.
- [x] Cookie-authenticated WebSocket tabs with exact Origin checks, repeated admission authorization, revocation rooms and an authorized counter audience.

## Verification

Verification uses the isolated Compose project `dzencode-auth-check`, with app database `dzencode_auth_check` and test database `dzencode_auth_check_test`. Existing project containers/volumes are not used. Liquibase applied eleven app and seven non-seed test changeSets, and repeated migration runs were idempotent.

The server suite passed 245 tests; the latest full client suite passed 352, including the regression for an auth form unmounted during its request. Root lint, typecheck, format:check, production build and git diff --check passed. Production dependency audit reported zero vulnerabilities. Both production Docker images built successfully before the follow-up client fixes below; the follow-up production checks use the local Next build.

The full headless Edge smoke passed with native Web Locks and with Web Locks disabled to exercise IndexedDB. Both modes covered delayed logout response ordering and successful login after SPA form unmount. The browser also verified authenticated WebSocket counts, cookie flags, another device's independent session, draft isolation, warmed-cache denial, and localized/mobile UI without hydration or missing-message errors. A valid 100-character unbroken name initially caused mobile horizontal overflow; local text wrapping fixed it, and both browser modes passed again with that name.

Verification containers were stopped/removed without deleting their database volume. Browser contexts and test processes were closed; no local development server was started. No commit, merge or publication was performed during verification.

Independent reviewers started from the requirements without implementation history. Review findings addressed include client/server email syntax parity, delayed cookie-response ordering and successful auth lifecycle after a form unmounts. The final reviewer reported no actionable findings after checking the fixes, independently passing 50 server unit tests, 43 client tests and 9 updated form/lifecycle tests. That reviewer did not run Docker, real DB tests or browser checks; those are separate implementation verification.

An earlier real-socket review found that namespace-wide counts could reach a socket still awaiting repeated authorization. Both open and close broadcasts now target only the authorized audience room. Deterministic real-socket regressions cover pending admission with/without an intervening logout and prevent timing-based false passes.

## Follow-up review fixes

A fresh review identified protected content that relied only on its reused layout, HTML name limits that counted UTF-16 units rather than Unicode code points, and a stale API integration paragraph. Groups/Settings now use a page-level server guard, and new-order content authorizes before rendering its form. Name length remains enforced by the shared client/server validation contract; HTML no longer truncates supplementary characters. The API overview now describes the implemented integration.

`scripts/auth-rsc-smoke.cjs` runs after `npm run build`, using the same Playwright package/browser configuration as the browser smoke. It starts a local production Next process and a controlled session-verification API on ephemeral loopback ports, without Docker or database writes. It captures a full router tree from authenticated browser navigation and replays partial RSC requests with a rejected cookie to Groups, Settings and the new-order form. It follows Next's RSC cache-key redirects and excludes metadata-only captures. The regression failed on a production build without the new content guards, then passed with the guards restored. The script closes its browser and both local servers.

DOM regressions cover entering 100 supplementary Unicode characters in both names and rejecting the next character. Order/product hook tests cover both sides of the asynchronous boundary: a stale callback sends no request, and an auth change while saving prevents late navigation. The two session checks deliberately remain on opposite sides of the await.

Another fresh reviewer independently passed all 352 client tests and 50 DB-free auth/users unit tests, reviewed the updated implementation and reported no confirmed actionable findings. That reviewer did not run servers, Docker or MySQL; the production RSC regression was verified separately as described above. The documented shared throttle budget behind one Next instance remains a deployment constraint.

## Owner review checklist

1. Register with names, email, password and matching confirmation. Check normalization, validation, duplicate email and generic invalid-login errors in EN and RU. Verify the language choice survives login/logout.
2. Open every inventory/form/Users/Groups/Settings route as a guest, including after an authenticated tab has warmed its cache. Confirm login redirect and safe local return; health stays public.
3. Create two accounts. Both see the same inventory. Users exposes only the current account's email and public participant names/dates.
4. Start an order/product draft, reload, switch accounts and return. Each account restores only its own draft; product drafts keep their order context. Clearing/saving a draft preserves existing revision behavior.
5. Open multiple tabs, a pending form or delete dialog, then sign out/switch accounts. Transient UI and sockets reset; abandoned results do not affect the new session. Another browser/device's separate login remains active.
6. Verify the counter connects/reconnects and logout disconnects the revoked session's tabs. The deployment must use the same hostname, exact `CLIENT_ORIGIN` and WebSocket forwarding.
7. Check the supported cookie setup: HTTP locally uses `AUTH_COOKIE_SECURE=false`; HTTPS uses true. Cookie/JWT persistence is deliberate, and account recovery/roles are outside stage 6c.

## Repeatable browser smoke

`scripts/auth-browser-smoke.cjs` uses a Playwright installation supplied through `PLAYWRIGHT_PACKAGE` (or a locally installed package). It defaults to headless Edge and loopback client/API ports 3011/4011. Point `AUTH_SMOKE_BASE_URL`/`AUTH_SMOKE_API_URL` only at an isolated local database and set `AUTH_SMOKE_ALLOW_WRITES=1`: the script creates test accounts, a shared order and drafts. `AUTH_SMOKE_ARTIFACTS` selects screenshot output. `AUTH_SMOKE_DISABLE_WEB_LOCKS=1` exercises the IndexedDB fallback. These are test-runner environment variables, not application configuration.

The smoke covers localized public shells, registration, HttpOnly persistence, warmed-cache guest denial, shared inventory, A/B draft isolation/recovery, cross-tab logout, another device's active session, authenticated counter, mobile overflow, SPA unmount during login, and a deliberately delayed logout response against another tab's login. The old implementation failed the cookie-ordering regression. Browser instrumentation may inspect HttpOnly cookies; application JavaScript cannot.

TLS termination, an external reverse proxy, other browser engines, multi-instance socket delivery and distributed rate limiting are not verified by the local HTTP/Edge smoke. Secure cookie configuration has unit coverage; production HTTPS deployment remains stage 8 work.
