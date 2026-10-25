import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useGlobalError } from './useGlobalError';
const savedLocale = vi.hoisted(() => vi.fn());
vi.mock('@/shared/i18n/localeAction', () => ({ getSavedLocale: savedLocale }));
describe('root failure recovery', () => {
  it('immediately supplies recovery text while the locale action never answers', () => {
    savedLocale.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useGlobalError());
    expect(result.current.messages.retry).toBe('Retry');
    expect(result.current.messages.title).toBe('Something went wrong');
  });
  it('keeps recovery available when the server rejects locale lookup', async () => {
    savedLocale.mockRejectedValue(new Error('offline'));
    const { result } = renderHook(() => useGlobalError());
    await waitFor(() => expect(savedLocale).toHaveBeenCalled());
    expect(result.current.messages.retry).toBe('Retry');
  });
  it('loads Russian recovery text when the action succeeds', async () => {
    savedLocale.mockResolvedValue('ru');
    const { result } = renderHook(() => useGlobalError());
    await waitFor(() => expect(result.current.locale).toBe('ru'));
    expect(result.current.messages.retry).toBe('Повторить');
  });
});
