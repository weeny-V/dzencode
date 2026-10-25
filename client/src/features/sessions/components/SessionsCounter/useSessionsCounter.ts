'use client';

import { useEffect } from 'react';
import { useSelector } from 'react-redux';

import { publishInventoryChange } from '@/shared/lib/inventoryEvents';
import { useAppDispatch } from '@/shared/store/hooks';

import { openSessionsChannel } from '../../api/sessionsChannel';
import {
  connectionChanged,
  countReceived,
  selectSessions,
  type SessionsState,
} from '../../store/sessionsSlice';

/**
 * Keeps this tab's connection open while the component is mounted and feeds what the server says into the store.
 * The counter sits in the top menu, which stays on every page, so the tab holds one connection for its whole life.
 */
export function useSessionsCounter(): SessionsState {
  const dispatch = useAppDispatch();

  useEffect(
    () =>
      openSessionsChannel({
        onCount: (count) => dispatch(countReceived(count)),
        onConnectionChange: (connected) => dispatch(connectionChanged(connected)),
        // The same socket carries the inventory events: a second connection would count as a second tab.
        onInventoryChange: publishInventoryChange,
      }),
    [dispatch],
  );

  return useSelector(selectSessions);
}
