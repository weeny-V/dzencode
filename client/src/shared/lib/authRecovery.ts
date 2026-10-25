import { reloadAfterAuth } from '@/shared/lib/authNavigation';

import type { ActionResult } from './actionResult';
import { announceAuthChange } from './authLifecycle';

/** Re-render the current cookie's identity; this may be another account rather than a guest. */
export function recoverAuthentication(result: ActionResult<unknown>): boolean {
  if (result.ok || !result.authenticationRequired) return false;
  announceAuthChange();
  reloadAfterAuth();
  return true;
}
