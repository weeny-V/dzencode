'use client';

import { useEffect, useRef, useState } from 'react';

import { isAbortError } from '@/shared/api/errors';

export type RequestStatus = 'loading' | 'success' | 'error';

export interface RequestState<T> {
  status: RequestStatus;
  data: T | undefined;
  error: unknown;
}

export interface UseRequestOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: unknown) => void;
}

/**
 * Runs a request once on mount and owns its lifecycle: loading state, abort on unmount and error handling.
 * This is the single place with try/catch for requests, so components and hooks that use it need none.
 *
 * `request` must be a stable reference (module-level function or `useCallback`): the request reruns when it changes.
 * `onSuccess` / `onError` are called after the state is set; they are not called after unmount.
 */
export function useRequest<T>(
  request: (signal: AbortSignal) => Promise<T>,
  options: UseRequestOptions<T> = {},
): RequestState<T> {
  const [state, setState] = useState<RequestState<T>>({
    status: 'loading',
    data: undefined,
    error: undefined,
  });

  // Callbacks usually are inline closures; keep the latest ones without rerunning the request.
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  });

  useEffect(() => {
    const controller = new AbortController();

    // An effect callback cannot be async itself, so the awaiting happens in a function inside it.
    const run = async () => {
      let data: T;
      try {
        data = await request(controller.signal);
      } catch (error) {
        if (isAbortError(error) || controller.signal.aborted) return;
        setState({ status: 'error', data: undefined, error });
        optionsRef.current.onError?.(error);
        return;
      }
      if (controller.signal.aborted) return;
      setState({ status: 'success', data, error: undefined });
      // Outside the try block, so an error thrown by onSuccess is not reported as a failed request.
      optionsRef.current.onSuccess?.(data);
    };

    void run();
    return () => controller.abort();
  }, [request]);

  return state;
}
