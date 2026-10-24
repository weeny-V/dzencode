'use client';

import { useEffect, useRef } from 'react';

/**
 * A ref that always holds the latest value. A callback that runs later (after an `await`, from a timer) reads
 * `ref.current` at that moment instead of the value its render saw, which may be out of date by then.
 */
export function useLatestRef<T>(value: T) {
  const ref = useRef(value);

  useEffect(() => {
    ref.current = value;
  });

  return ref;
}
