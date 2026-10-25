import { act, renderHook } from '@testing-library/react';
import { StrictMode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { deferred } from '@/testing/fixtures';

import { useDeletion } from './useDeletion';
import { useLatestRef } from './useLatestRef';
import { useMountedRef } from './useMountedRef';

describe('lifecycle guards', () => {
  it('tracks mounting through StrictMode and unmount', () => {
    const { result, unmount } = renderHook(useMountedRef, { wrapper: StrictMode });
    const ref = result.current;
    expect(ref.current).toBe(true);
    unmount();
    expect(ref.current).toBe(false);
  });
  it('keeps a stable ref with the latest committed context', () => {
    const { result, rerender } = renderHook(({ id }) => useLatestRef(id), {
      initialProps: { id: 7 },
    });
    const ref = result.current;
    rerender({ id: 8 });
    expect(result.current).toBe(ref);
    expect(ref.current).toBe(8);
  });
});

describe('useDeletion', () => {
  it('keeps a failed request open and allows retry', async () => {
    const remove = vi.fn().mockResolvedValueOnce('Offline').mockResolvedValueOnce(undefined);
    const onDeleted = vi.fn();
    const { result } = renderHook(() => useDeletion(remove, onDeleted));
    await act(async () => {
      await result.current.confirm(7);
    });
    expect(result.current.error).toBe('Offline');
    expect(result.current.pending).toBe(false);
    expect(onDeleted).not.toHaveBeenCalled();
    await act(async () => {
      await result.current.confirm(7);
    });
    expect(result.current.error).toBeUndefined();
    expect(onDeleted).toHaveBeenCalledWith(7, true);
  });
  it('reports late success without closing a newer dialog', async () => {
    const first = deferred<string | undefined>();
    const second = deferred<string | undefined>();
    const remove = vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const onDeleted = vi.fn();
    const { result } = renderHook(() => useDeletion(remove, onDeleted));
    let operation!: Promise<void>;
    act(() => {
      operation = result.current.confirm(7);
    });
    expect(result.current.pending).toBe(true);
    act(() => result.current.reset());
    let next!: Promise<void>;
    act(() => {
      next = result.current.confirm(8);
    });
    await act(async () => {
      first.resolve(undefined);
      await operation;
    });
    expect(onDeleted).toHaveBeenCalledWith(7, false);
    expect(result.current.pending).toBe(true);
    await act(async () => {
      second.resolve('Second failed');
      await next;
    });
    expect(result.current.error).toBe('Second failed');
  });
  it('ignores the failure of a closed dialog', async () => {
    const response = deferred<string | undefined>();
    const { result } = renderHook(() => useDeletion(() => response.promise, vi.fn()));
    let request!: Promise<void>;
    act(() => {
      request = result.current.confirm(7);
    });
    act(() => result.current.reset());
    await act(async () => {
      response.resolve('Offline');
      await request;
    });
    expect(result.current).toMatchObject({ pending: false, error: undefined });
  });
});
