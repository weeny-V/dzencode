# Deployment and reviewer handoff

Preparation template for stage 8. Items are intentionally unchecked until there is evidence. Independent acceptance is performed by the customer/reviewer using their criteria.

## Deployment identity

| Field                                  | Value                                                                                       |
| -------------------------------------- | ------------------------------------------------------------------------------------------- |
| Public HTTPS URL                       | Not deployed                                                                                |
| Source repository / deployed commit    | [weeny-V/dzencode](https://github.com/weeny-V/dzencode) / not deployed                      |
| Application host / plan / region       | Proposed: Render Free; not selected in an account                                           |
| Persistent database / version / region | Proposed: Aiven MySQL Free; not provisioned                                                 |
| Last verification date                 | Not performed                                                                               |
| Free-tier restrictions                 | To be confirmed for the created services; record idle sleep, cold start and resource quotas |

Do not put passwords, tokens, private keys or connection strings in this document. A reviewer can register their own demonstration account.

## Operator self-check

- [ ] A clean checkout can be installed and started using only README instructions and documented prerequisites.
- [ ] Required example environment files and secret generation are documented; no real secrets are committed.
- [ ] Liquibase applies the schema and demo seed successfully; running migrations again preserves existing data.
- [ ] Production startup listens on the platform's assigned public port and reports real bound addresses.
- [ ] HTTPS redirects, Secure cookies and WebSocket forwarding work through the public proxy.
- [ ] The runtime remains within the selected free instance's memory and connection limits during the demo scenarios.
- [ ] Application restarts/redeploys preserve database records, account access and the persistent JWT secret.
- [ ] MySQL connections verify the server certificate and hostname against the configured CA.
- [ ] Database export, storage and recovery steps are documented and tested against an isolated restore target.
- [ ] Quality checks, database integration tests and the permanent Playwright suite pass; record the tested commit and actual results.
- [ ] Any temporary local services, containers and verification data are cleaned up.

## Public demo observations

- [ ] Registration/login work; protected pages reject a guest.
- [ ] Create an order and a product, search/filter them, cancel a deletion and confirm deletion.
- [ ] EN/RU changes preserve the current URL and fields; reloading restores a draft.
- [ ] A second tab receives inventory changes and the session count changes when tabs open/close.
- [ ] Logging out closes the current session's tabs without revoking a separate login.
- [ ] Groups tables, charts and relations render; a configured map works or the unconfigured-map state is clearly explained.
- [ ] Filtered CSV files download with the documented locale formatting.
- [ ] Manifest/icons and the service worker are served over HTTPS; the offline page works and personal/API responses are not cached.
- [ ] Narrow-screen pages remain usable without horizontal overflow.
- [ ] After a period of idle sleep, the documented wake-up procedure restores the demo; limitations are stated in the handoff.

## Handoff notes

Record the URL, deployed commit, brief navigation instructions, shared-data behavior and observed free-tier limitations. State separately what was not verified. The inventory is intentionally shared across registered accounts, so changes by one reviewer are visible to others. Do not reset the hosted database as part of a reviewer visit.

The finished record supports review; it does not replace the original task requirements or independent acceptance.
