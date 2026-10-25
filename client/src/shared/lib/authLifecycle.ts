const CHANGE_KEY = 'inventory:auth:change';
const CHANNEL_NAME = 'inventory:auth';
let generation = 0;
const listeners = new Set<() => void>();

export const authGeneration = () => generation;
export function invalidateAuth() {
  generation += 1;
  for (const listener of listeners) listener();
}
export function subscribeAuthInvalidation(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
/** Credential-free notifications; cookie contents are never read by application JavaScript. */
export function announceAuthChange() {
  invalidateAuth();
  const event = String(Date.now()) + ':' + String(Math.random());
  try {
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channel.postMessage(event);
    channel.close();
  } catch {
    /* Storage notification remains available when BroadcastChannel is denied. */
  }
  try {
    localStorage.setItem(CHANGE_KEY, event);
  } catch {
    /* Focus checks recover missed notifications. */
  }
}
export function listenAuthChanges(onChange: () => void) {
  const receive = () => {
    invalidateAuth();
    onChange();
  };
  const storage = (event: StorageEvent) => {
    if (event.key === CHANGE_KEY) receive();
  };
  let channel: BroadcastChannel | undefined;
  try {
    channel = new BroadcastChannel(CHANNEL_NAME);
    channel.onmessage = receive;
  } catch {
    /* Storage/focus fallback. */
  }
  window.addEventListener('storage', storage);
  return () => {
    channel?.close();
    window.removeEventListener('storage', storage);
  };
}
export const requestAuthCheck = () => window.dispatchEvent(new Event('inventory:auth:check'));
