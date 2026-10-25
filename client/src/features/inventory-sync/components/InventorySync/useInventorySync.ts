'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { startTransition, useCallback, useEffect, useRef, useState } from 'react';

import { useAuthSession } from '@/shared/hooks/useAuthSession';
import { type InventoryChange, subscribeInventoryChanges } from '@/shared/lib/inventoryEvents';

import { expireInventory } from '../../actions';

/** Changes that arrive together (a burst, or this tab's own event next to its own mutation) become one refresh. */
export const SYNC_DELAY_MS = 250;
const NOTICE_MS = 8000;

/**
 * Keeps the open page current when the inventory changes elsewhere: collects the changes announced over the socket,
 * expires the affected cache tags with one Server Action, then re-renders the page's server data. The tab that made
 * a change hears its own event too; the extra refresh is harmless and merged by the delay. An order panel left open
 * for an order that was deleted meanwhile closes with a notice.
 */
export function useInventorySync() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const session = useAuthSession();
  const [notice, setNotice] = useState(false);
  const pending = useRef<InventoryChange[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // The latest URL, read when the batch is flushed: the tab's own deletion has closed its panel by then.
  const url = useRef({ pathname, search: searchParams.toString() });
  useEffect(() => {
    url.current = { pathname, search: searchParams.toString() };
  }, [pathname, searchParams]);

  const flush = useCallback(async () => {
    timer.current = undefined;
    const batch = pending.current.splice(0);
    if (batch.length === 0 || !session.isCurrent()) return;
    const params = new URLSearchParams(url.current.search);
    const open = Number(params.get('order'));
    if (batch.some((change) => change.type === 'order.deleted' && change.orderId === open)) {
      params.delete('order');
      const search = params.toString();
      router.replace(search ? `${url.current.pathname}?${search}` : url.current.pathname);
      setNotice(true);
    }
    try {
      const result = await expireInventory(batch);
      if (!result.ok || !session.isCurrent()) return;
      startTransition(() => router.refresh());
    } catch {
      // A failed refresh keeps the page as it is; the next change or the cache lifetime catches up.
    }
  }, [router, session]);

  useEffect(
    () =>
      subscribeInventoryChanges((change) => {
        if (!session.isCurrent()) return;
        pending.current.push(change);
        timer.current ??= setTimeout(() => void flush(), SYNC_DELAY_MS);
      }),
    [flush, session],
  );
  useEffect(
    () => () => {
      clearTimeout(timer.current);
      timer.current = undefined;
      pending.current = [];
    },
    [],
  );
  useEffect(() => {
    if (!notice) return;
    const hide = setTimeout(() => setNotice(false), NOTICE_MS);
    return () => clearTimeout(hide);
  }, [notice]);

  return { notice, dismiss: () => setNotice(false) };
}
