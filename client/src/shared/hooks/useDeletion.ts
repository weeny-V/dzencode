'use client';

import { useCallback, useState } from 'react';

import { createLatest } from '../lib/latest';

interface DeletionState {
  pending: boolean;
  /** The reason the deletion failed; `undefined` while nothing failed. An empty string means "no reason given". */
  error: string | undefined;
}

/**
 * The state of one deletion request for a confirmation window: waiting for the answer, or why it failed.
 * `remove` does the request and answers with the failure text, or `undefined` when it worked (the feature's hook
 * calls its Server Action there, so the shared code stays free of the transport and the store).
 *
 * The window may be closed while the request runs and opened again for another item. Only the newest request may
 * change what the window shows (`pending`, the failure); the answer of an older one is not shown there. A deletion
 * that worked is reported either way, because the item is gone: `onDeleted` gets `stillOpen`, whether the window
 * that asked for it is still the one on screen (only then it should be closed).
 */
export function useDeletion(
  remove: (id: number) => Promise<string | undefined>,
  onDeleted: (id: number, stillOpen: boolean) => void,
) {
  const [state, setState] = useState<DeletionState>({ pending: false, error: undefined });
  const [latest] = useState(createLatest);

  const confirm = useCallback(
    async (id: number) => {
      const operation = latest.begin();
      setState({ pending: true, error: undefined });
      const error = await remove(id);
      const stillOpen = latest.isCurrent(operation);
      if (stillOpen) setState({ pending: false, error });
      if (error === undefined) onDeleted(id, stillOpen);
    },
    [latest, remove, onDeleted],
  );

  /** Forgets an old failure and a request that is still running; call it when the window closes. */
  const reset = useCallback(() => {
    latest.cancel();
    setState({ pending: false, error: undefined });
  }, [latest]);

  return { ...state, confirm, reset };
}
