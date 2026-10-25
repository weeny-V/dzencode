/** A full document navigation discards the previous account's Next router cache and client state. */
export function navigateAfterAuth(path: string) {
  window.location.assign(new URL(path, window.location.origin).href);
}
export function reloadAfterAuth() {
  window.location.reload();
}
