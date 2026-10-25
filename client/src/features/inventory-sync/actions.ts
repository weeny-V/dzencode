'use server';

import { updateTag } from 'next/cache';

import { requireSession } from '@/shared/api/session.server';
import { parseChangeBatch } from '@/shared/lib/inventoryEvents';

import { tagsForChanges } from './tags';

/**
 * Expires the cached inventory that a batch of changes made stale, so the refresh that follows reads fresh data.
 * It runs for tabs that only heard about a change, so it also covers writes made directly against the API.
 * Only a signed-in visitor may call it, only known change shapes are accepted, and nothing but cache tags changes.
 */
export async function expireInventory(changes: unknown): Promise<{ ok: boolean }> {
  await requireSession();
  const batch = parseChangeBatch(changes);
  if (!batch) return { ok: false };
  for (const tag of tagsForChanges(batch)) updateTag(tag);
  return { ok: true };
}
