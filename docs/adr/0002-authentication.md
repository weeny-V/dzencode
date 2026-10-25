# ADR 0002: Revocable authentication for one shared inventory

Status: implemented in stage 6c on the accepted stage 6b base; approved by the owner for integration into main.

## Scope and dependency

Every authenticated user reads, creates and deletes the same orders and products. There are no roles or account-management features. Registration collects first name, last name, normalized unique email, password and confirmation, then logs the user in. Login uses email/password; logout revokes only the current browser session. Email verification, recovery, social login and 2FA are outside this stage.

The owner authorized independent server work from main while 6b awaited review, then authorized integration after 6b was accepted into main at c6170a3. Stage 6c now includes the client and server implementation. Verification and the owner review checklist are tracked in [the implementation status](../AUTH_IMPLEMENTATION.md). After review fixes, the owner approved committing stage 6c and merging it into main.

## Credentials and persistent sessions

- Passwords use Node's asynchronous scrypt, a random 16-byte salt and a versioned hash record. Parameters are N=131072, r=8, p=1 with a 64-byte derived key and timing-safe comparison. At most two KDF operations run per API process; excess work returns 429. This follows the [OWASP scrypt baseline](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html#scrypt). Passwords are not trimmed or normalized; registration requires at least 12 characters and at most 1024 UTF-8 bytes.
- Email is trimmed and lowercased, uses a bounded ASCII mailbox syntax, and is protected by a MySQL unique constraint. No provider-specific dot or plus rewriting is applied. A duplicate registration returns 409. Unknown email and wrong password both return the same 401 and both perform a KDF.
- JWT signing/verification uses [jose](https://github.com/panva/jose), pins HS256, issuer, audience and token type, and checks the user/session claims. The persistent `AUTH_JWT_SECRET` must contain at least 32 bytes, generated randomly. The API refuses to start with a missing/short key. Changing it invalidates all previously issued tokens.
- JWTs deliberately have no `exp`. Each contains a user id, random 32-byte session id and issued-at time. Every authorization checks the signature, an unrevoked `auth_sessions` record bound to that user, and the user's existence. No refresh token or Redis is used. API restarts preserve sessions.
- `users` owns user/credential SQL; `auth` owns `auth_sessions`. Registration coordinates their writes in one transaction passed through the composition root; neither repository writes another module's tables. A failed session insert rolls back registration.
- Login and registration have bounded, process-local, 15-minute IP windows: 20 login attempts and 10 registrations. Malformed attempts count. The API uses its actual peer address and does not trust `X-Forwarded-For`. Until a trusted proxy strategy is introduced, requests forwarded by one Next instance share this conservative limit. This is a documented simple-scope limit, not distributed abuse protection.

## HTTP and browser cookie contract

REST accepts `Authorization: Bearer <JWT>`, including mutations. It deliberately ignores cookies as REST credentials. Auth, current-user, participants and inventory responses use `Cache-Control: no-store`; Next separately caches completed inventory JSON after checking the active session.

Login/register return `{ user, token }` to the Next server. Next Server Actions consume the token only on the server, set `dzencode_auth` as a host-only HttpOnly cookie with Path=/, SameSite=Lax and a one-year max-age, and return only a safe destination to React. `AUTH_COOKIE_SECURE` defaults to true in production; HTTPS requires true, local HTTP/HTTP Compose explicitly use false. No token or password enters Redux, localStorage, socket auth payloads or browser-readable props. The locale cookie is separate. Browser cookie persistence is finite even though JWTs do not expire; clearing/losing the cookie requires login again and does not itself revoke the old DB session.

`GET /auth/me` returns the current user (including their email) and the non-credential session id for server-side cache isolation. `GET /users` returns only id, first name, last name and registration date. Other users' email and all password hashes are excluded.

Next logout awaits successful API revocation before clearing the cookie and synchronizing the auth lifecycle across tabs. A definite 401 also clears an already-invalid cookie; an unavailable API does not count as successful logout. Logout cannot cancel an inventory write already accepted by the server. Other devices' distinct sessions stay active.

Auth writes run inside one cross-tab Web Lock until the response's Set-Cookie has been applied. Ordinary HTTP uses an exclusive IndexedDB transaction on an empty mutex store instead; it stores no identity, token, password or owner. Denied coordination fails the operation rather than allowing unordered cookie writes. A queued action rechecks its mounted/auth generation before sending. A successful mutation announces the cookie change before releasing the mutex even if its form unmounted; it then reloads the current address instead of applying an abandoned destination. This prevents a delayed logout/login response from removing or replacing a newer session's cookie.

## Authenticated tab counter

The existing in-memory `sessions` module still counts open tabs, rather than users. It is separate from the persistent `auth_sessions` registry. The browser sends the host-only HttpOnly cookie to Socket.io with credentials; the supported deployment uses the same hostname for client and API (local ports may differ). The client uses WebSocket transport, whose browser handshake includes Origin even behind a same-origin proxy. Deployment proxies must forward WebSocket upgrades.

The server validates exact Origin on the Engine.IO handshake, subsequent polling requests and WebSocket upgrades. Missing or untrusted origins are rejected. Socket.io verifies the cookie against the same auth service before accepting a tab. Each accepted socket joins a room for its auth session and is rechecked before it contributes to the counter, closing the logout/join race. Only after that check does it join the separate counter audience room; both open and close broadcasts target that audience rather than every Socket.io connection. A pending socket cannot receive counts while its repeated authorization is unresolved. Successful logout disconnects every socket in that session's room; reconnect with a revoked token fails. Other sessions remain connected.

Both the counter and immediate socket-disconnect notifications are process-local. Multiple API instances require a shared event/adapter design; that is outside the current single-instance deployment. Durable REST authorization always checks MySQL, including after an API restart.

## Client integration

Request-scoped session validation precedes every cached inventory lookup, including warmed hits. Cookies are read outside `unstable_cache`; bearer credentials never enter persistent keys. Explicit user/session ids isolate cached results while existing inventory tags and mutation invalidation remain. Session and writes are uncached. Reads preserve Next redirect control flow; actions return an explicit authentication-required result to reload the current address. Expected session ids guard submissions from a stale UI.

The protected app shell remounts on auth-session changes, resets transient Redux/dialog/form state and closes old sockets. Auth forms have no drafts. Inventory drafts keep 6b's seven-day/version/revision rules, use a user-id namespace and never adopt legacy anonymous drafts. Lifecycle guards prevent old form/action results from navigating or modifying the new session's UI. Same-browser tabs receive only credential-free BroadcastChannel/storage notifications; focus, visibility and restored-page checks recover missed changes without signing the user out on a transient API outage.

Public login/register screens use the minimal logo/language shell and EN-default explicit EN/RU dictionaries from 6b. Inventory, forms, users, groups and settings are protected; `/health` stays public. Return URLs must be validated local paths. The Users screen contains the current-user card and participant list only.
