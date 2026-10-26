# Stage 7d implementation and owner review

Branch: `stage/7d-tests-scripts`, based on `main` at `b913d2b`. The agreed scope is in [STAGE_7D_PLAN.md](STAGE_7D_PLAN.md). After the verification recorded below, the owner approved committing stage 7d and merging it into main.

## Delivered behavior

Repository-owned Playwright/Chromium scenarios, separate no-MySQL/integration/E2E commands and an aggregate `check`. The disposable Compose runner uses separate application and integration schemas, applies Liquibase, starts production services and tears down its own project on completion or failure. Existing stage smoke scripts remain historical investigation tools. README documents installation, filtering, reports and recovery after a forced termination.

Browser testing exposed an early-input race in create forms: their server-rendered fields accepted edits before the form's JavaScript was ready, so those edits could miss the draft subscription. `FormLayout` now disables its fieldset, clear button and submit until hydration, and uses POST. Fields stay editable during an in-flight save, preserving the existing newer-draft behavior. A server-rendered markup test and a JavaScript-disabled browser scenario cover the guard.

## Verification

Run on 2026-10-26 with Node 22.23.3 on Windows, Playwright Test 1.64.1 and its pinned Chromium 156.0.8078.4. Production services ran in Linux containers; the existing `dzencode6d` project was left running.

| Check                                                    | Result                                                                                               |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `npm run check`                                          | pass: formatting, package/E2E lint and typechecks, all tests below without MySQL                     |
| Server no-MySQL tests                                    | 20 files, 198 tests pass                                                                             |
| Client Node/DOM tests                                    | 79 files, 544 tests pass                                                                             |
| Runner lifecycle tests                                   | 8 pass, including teardown at each failed setup/test step                                            |
| `npm run test:system`                                    | pass on a fresh volume: 8 files / 102 integration tests, then 12 Chromium E2E scenarios              |
| Standalone `npm run test:e2e`                            | pass: 12 scenarios in 23 seconds on another fresh stack, no retries                                  |
| Server/client production Docker builds and health checks | pass                                                                                                 |
| Concurrent managed invocation                            | rejected by the lock before any Docker mutation                                                      |
| Failed browser run                                       | nonzero exit, screenshots/traces/HTML report produced, containers/network/volume removed             |
| Successful system run                                    | containers/network/volume and lock removed                                                           |
| `npm run audit:prod`                                     | pass, 0 production vulnerabilities                                                                   |
| Ordinary host `npm run build`                            | server passes; client blocked by Windows Application Control when loading `@swc/core-win32-x64-msvc` |

The host build failure is an environment restriction (`ERR_DLOPEN_FAILED`, "An Application Control policy has blocked this file"), not a successful build. It was not bypassed. The same production sources built and ran successfully through the test Compose stack.

The no-MySQL command initially included one pre-existing real-database repository test file; classification was corrected to include both `*.api.test.ts` and `*.repository.test.ts` in the integration project. HTTP/socket checks also need loopback permission; their first sandboxed attempt was denied, and they passed when rerun with that permission. New browser-test locator and readiness mistakes were corrected before the passing runs. A later standalone run exposed a streaming-specific locator race: the temporary skeleton and the completed order panel briefly share a class. The tests now select the completed panel by its existing stable id/accessible region. No automatic retries were used to hide failures.

Local ignored evidence: `test-results/stage7d-system.log`, `test-results/stage7d-e2e.log` and `playwright-report/index.html`. Failed runs generated screenshots/traces during development; the latest successful run replaces the current browser report/output. The README describes the maintained commands rather than relying on external Playwright paths or stage-specific write flags. A final Docker inventory confirmed no `dzencode-tests-*` containers or volumes remain, the lock is gone and the existing `dzencode6d` project remains running.

## Limits

- Chromium only; no Firefox, WebKit, real-device or deployed HTTPS verification.
- Map tiles are controlled fixtures, not a provider-availability check.
- CI and stage 8 deployment/self-check are outside this scope.
- Historical smoke race scenarios are not all duplicated in E2E; existing Vitest/DOM race tests remain part of the quality command.
- Docker build caches/images and installed Chromium remain available locally; containers, networks and test database volumes are disposable.
- Reports/traces may contain test credentials and must not be published without review.
- POSIX runner interruption handling is implemented but was not exercised on a Linux/macOS host; force-kill recovery remains manual.
- Full `npm audit` reports three existing development dependency findings in Vitest, its mocker and tinypool. The suggested remediation upgrades Vitest to a new major; that migration was not bundled into this stage. Production dependencies audit cleanly.

The owner accepted stage 7d and explicitly authorized its commit and merge into main. This completes stage 7; stage 8 remains separate.
