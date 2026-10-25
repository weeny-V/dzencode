import { RateLimitError } from '../../shared/errors.js';

const WINDOW_MS = 15 * 60 * 1000;
const MAX_KEYS = 10000;

/** A bounded fixed-window limiter for one API process; never trusts forwarding headers. */
export const createAuthThrottle = (now: () => number = Date.now) => {
  const entries = new Map<string, { attempts: number; until: number }>();
  return {
    check(operation: 'login' | 'register', address: string): void {
      const time = now();
      for (const [key, entry] of entries) if (entry.until <= time) entries.delete(key);
      const key = `${operation}:${address}`;
      let entry = entries.get(key);
      if (!entry) {
        if (entries.size >= MAX_KEYS) throw new RateLimitError(60);
        entry = { attempts: 0, until: time + WINDOW_MS };
        entries.set(key, entry);
      }
      if (entry.attempts >= (operation === 'login' ? 20 : 10)) {
        throw new RateLimitError(Math.max(1, Math.ceil((entry.until - time) / 1000)));
      }
      entry.attempts += 1;
    },
  };
};
