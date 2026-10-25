import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { Suspense, use, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { deferred } from '@/testing/fixtures';
import { render } from '@/testing/i18n';
import { navigation } from '@/testing/navigation';

import { SearchField } from './index';

vi.mock('next/navigation', async () => (await import('@/testing/navigation')).navigationMock);
beforeEach(() => {
  vi.clearAllMocks();
  navigation.pathname = '/orders';
  navigation.search = 'order=7';
  window.history.replaceState({}, '', '/orders?order=7');
});
afterEach(() => vi.useRealTimers());

describe('SearchField', () => {
  it('debounces 250ms, trims text and preserves the latest query parameters', () => {
    vi.useFakeTimers();
    render(<SearchField enabled />);
    const input = screen.getByRole('searchbox');
    fireEvent.change(input, { target: { value: ' mon ' } });
    void act(() => vi.advanceTimersByTime(200));
    fireEvent.change(input, { target: { value: ' monitor ' } });
    void act(() => vi.advanceTimersByTime(249));
    expect(navigation.replace).not.toHaveBeenCalled();
    window.history.replaceState({}, '', '/orders?order=8');
    void act(() => vi.advanceTimersByTime(1));
    expect(navigation.replace).toHaveBeenCalledWith('/orders?order=8&q=monitor', { scroll: false });
  });
  it('cancels a pending debounce when the page is left', () => {
    vi.useFakeTimers();
    const { unmount } = render(<SearchField enabled />);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'monitor' } });
    unmount();
    void act(() => vi.advanceTimersByTime(300));
    expect(navigation.replace).not.toHaveBeenCalled();
  });
  it('clears immediately with Escape and adopts external URL changes', () => {
    const { rerender } = render(<SearchField enabled />);
    const input = screen.getByRole('searchbox');
    fireEvent.change(input, { target: { value: 'monitor' } });
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(input).toHaveValue('');
    expect(navigation.replace).toHaveBeenCalledWith('/orders?order=7', { scroll: false });
    navigation.search = 'order=7&q=other';
    rerender(<SearchField enabled />);
    expect(input).toHaveValue('other');
  });
  it('marks the existing UI pending until the server navigation completes', async () => {
    const response = deferred<string>();
    let navigate!: (response: Promise<string>) => void;
    function Result({ promise }: { promise: Promise<string> | undefined }) {
      return promise ? use(promise) : 'Previous rows';
    }
    function Page() {
      const [promise, setPromise] = useState<Promise<string>>();
      navigate = setPromise;
      return (
        <>
          <SearchField enabled />
          <Suspense fallback="Loading">
            <Result promise={promise} />
          </Suspense>
        </>
      );
    }
    navigation.replace.mockImplementation(() => navigate(response.promise));
    render(<Page />);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'monitor' } });
    await act(async () => {
      fireEvent.submit(screen.getByRole('search'));
      await Promise.resolve();
    });
    expect(screen.getByRole('search')).toHaveAttribute('data-pending');
    expect(screen.getByText('Previous rows')).toBeVisible();
    expect(screen.queryByText('Loading')).not.toBeInTheDocument();
    await act(async () => {
      response.resolve('New rows');
      await response.promise;
    });
    await waitFor(() => expect(screen.getByRole('search')).not.toHaveAttribute('data-pending'));
    expect(screen.getByText('New rows')).toBeVisible();
  });
});
