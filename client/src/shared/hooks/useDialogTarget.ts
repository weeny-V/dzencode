'use client';

import { useCallback, useState } from 'react';

export interface DialogTarget<T> {
  /** What the window is about. It stays after the window closes, so the closing animation can still show it. */
  target: T | undefined;
  open: boolean;
  /** Opens the window for an item. */
  ask: (item: T) => void;
  close: () => void;
}

/** The state of a confirmation window that is opened for one item of a list at a time. */
export function useDialogTarget<T>(): DialogTarget<T> {
  const [state, setState] = useState<{ target: T; open: boolean }>();

  const ask = useCallback((item: T) => setState({ target: item, open: true }), []);
  const close = useCallback(
    () => setState((current) => current && { ...current, open: false }),
    [],
  );

  return { target: state?.target, open: state?.open ?? false, ask, close };
}
