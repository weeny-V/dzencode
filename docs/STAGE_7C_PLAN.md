# Stage 7c: Web Worker, PWA and front-end optimization

Branch: `stage/7c-worker-pwa`, from `main` after stage 7b (`4986d77`). Part of stage 7 (see [PLAN.md](PLAN.md)).

## Agreed choices

| Decision     | Selected behavior                                                                                                                                                                                                                                                         |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CSV export   | Orders and Products, current search and type filter; the delimiter follows the language (comma for EN, semicolon for RU), UTF-8 with BOM, interface-language headers. Data comes from a Server Action, the file is built in a Web Worker, with a busy state and a cancel. |
| PWA          | Manifest, a hand-written service worker registered only in production and a secure context, an offline page. Only static files and the offline page are cached; never pages, API or authenticated data. Quiet update at the next open.                                    |
| Icons        | Generated from the current shield logo by a script that stays in the repository.                                                                                                                                                                                          |
| Optimization | Lighthouse and request-size measurements before and after; cheap, safe fixes for what is found. Bootstrap and the shared SCSS are not touched.                                                                                                                            |

## Owner review checklist

### CSV export

- [ ] Orders and Products have an "Export CSV" button next to the title; it exports the current search (and the type filter on Products), not just the visible rows.
- [ ] The file opens correctly in Excel: Cyrillic is intact, columns split (comma in EN, semicolon in RU), amounts and dates are readable.
- [ ] A title that looks like a formula (`=1+1`, `+cmd`) is saved as text (with a leading apostrophe).
- [ ] While the file is being prepared the button shows the busy state and can be cancelled; a failure shows a message; nothing is saved after sign-out.

### PWA

- [ ] The browser offers to install the app; it opens in its own window with the green theme and the shield icon.
- [ ] With the network off, opening any page shows the offline page (in the browser's language) with a "Try again" button.
- [ ] The device keeps only static files and the offline page: after browsing and signing out, no page, API or personal response is in the Cache Storage.
- [ ] A new version of the app is picked up the next time it is opened, without a prompt.

### Front-end

- [ ] The title of Orders, Products and Groups appears with the first paint; the count appears a moment later in the same title.
- [ ] The sign-in and create forms still work; the sign-in button is only enabled once the page is ready.
- [ ] The before/after table in [STAGE_7C_STATUS.md](STAGE_7C_STATUS.md) matches what you see; the open findings are acknowledged.

### Handover

- [ ] Root lint, typecheck, test, format:check, build and the production audit pass; the isolated Docker stack and all browser smokes pass; started processes are stopped.
- [ ] No commit or merge into `main` without the owner's OK.

## References

- [ADR 0006](adr/0006-csv-worker-pwa-and-lean-first-load.md)
