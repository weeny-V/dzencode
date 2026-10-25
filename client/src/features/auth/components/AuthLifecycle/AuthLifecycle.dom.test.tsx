import { act, render, screen, waitFor } from '@testing-library/react';
import { type ReactNode, useEffect } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuthSession } from '@/shared/hooks/useAuthSession';
import { announceAuthChange, invalidateAuth } from '@/shared/lib/authLifecycle';
import { AuthSessionProvider } from '@/shared/ui/AuthSessionProvider';
import { testIdentity } from '@/testing/auth';
import { deferred } from '@/testing/fixtures';

import { AuthLifecycle } from '.';

const state = vi.hoisted(() => ({
  inspectSession: vi.fn(),
  navigateAfterAuth: vi.fn(),
  reloadAfterAuth: vi.fn(),
}));
vi.mock('../../actions', () => ({ inspectSession: state.inspectSession }));
vi.mock('@/shared/lib/authNavigation', () => state);
beforeEach(() => {
  vi.resetAllMocks();
  state.inspectSession.mockResolvedValue({ ok: true, data: testIdentity });
});
const Wrapper = ({ children }: { children: ReactNode }) => (
  <AuthSessionProvider identity={testIdentity}>
    <AuthLifecycle identity={testIdentity}>{children}</AuthLifecycle>
  </AuthSessionProvider>
);
describe('auth lifecycle isolation', () => {
  it('unmounts transient content and invalidates existing callbacks on same-tab auth change', () => {
    const cleanup = vi.fn();
    let current: (() => boolean) | undefined;
    function Probe() {
      const session = useAuthSession();
      useEffect(() => {
        current = session.isCurrent;
        return cleanup;
      }, [session]);
      return <div>private state</div>;
    }
    render(
      <Wrapper>
        <Probe />
      </Wrapper>,
    );
    expect(current?.()).toBe(true);
    void act(() => announceAuthChange());
    expect(screen.queryByText('private state')).not.toBeInTheDocument();
    expect(current?.()).toBe(false);
    expect(cleanup).toHaveBeenCalledOnce();
  });
  it('handles credential-free storage notifications by dropping old content and reloading', () => {
    render(
      <Wrapper>
        <div>private state</div>
      </Wrapper>,
    );
    void act(() =>
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'inventory:auth:change',
          newValue: 'notification-only',
        }),
      ),
    );
    expect(screen.queryByText('private state')).not.toBeInTheDocument();
    expect(state.reloadAfterAuth).toHaveBeenCalledOnce();
  });
  it('rechecks on focus and does not confuse a network outage with logout', async () => {
    render(
      <Wrapper>
        <div>private state</div>
      </Wrapper>,
    );
    state.inspectSession.mockResolvedValueOnce({ ok: false, error: 'unavailable' });
    await act(async () => {
      window.dispatchEvent(new Event('focus'));
      await Promise.resolve();
    });
    expect(screen.getByText('private state')).toBeVisible();
    expect(state.reloadAfterAuth).not.toHaveBeenCalled();
    state.inspectSession.mockResolvedValueOnce({ ok: true, data: null });
    await act(async () => {
      window.dispatchEvent(new Event('focus'));
      await Promise.resolve();
    });
    expect(state.reloadAfterAuth).toHaveBeenCalledOnce();
    expect(screen.queryByText('private state')).not.toBeInTheDocument();
  });
  it('ignores a late recheck result after a newer auth change', async () => {
    const response = deferred<{ ok: true; data: null }>();
    state.inspectSession.mockReturnValueOnce(response.promise);
    render(
      <Wrapper>
        <div>private state</div>
      </Wrapper>,
    );
    void act(() => window.dispatchEvent(new Event('focus')));
    await waitFor(() => expect(state.inspectSession).toHaveBeenCalledOnce());
    void act(() => invalidateAuth());
    await act(async () => {
      response.resolve({ ok: true, data: null });
      await response.promise;
    });
    expect(state.reloadAfterAuth).not.toHaveBeenCalled();
  });
});
