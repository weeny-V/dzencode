import { act, fireEvent, render as renderUi, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { invalidateAuth } from '@/shared/lib/authLifecycle';
import { TestAuth } from '@/testing/auth';
import { deferred } from '@/testing/fixtures';

const mocks = vi.hoisted(() => ({
  load: vi.fn(),
  mount: vi.fn(),
  gate: undefined as Promise<void> | undefined,
}));
vi.mock('./chartLoader', () => ({ loadChartRuntime: mocks.load }));
let callbacks: IntersectionObserverCallback[];
let disconnects: ReturnType<typeof vi.fn>[];
beforeEach(() => {
  mocks.mount.mockReset();
  mocks.gate = undefined;
  mocks.load.mockImplementation(async () => {
    await mocks.gate;
    return { mountBarChart: mocks.mount };
  });
  callbacks = [];
  disconnects = [];
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      disconnect = vi.fn();
      observe = vi.fn();
      constructor(callback: IntersectionObserverCallback) {
        callbacks.push(callback);
        disconnects.push(this.disconnect);
      }
    },
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
const enter = async (index = callbacks.length - 1) => {
  await act(async () => {
    callbacks[index](
      [{ isIntersecting: true } as IntersectionObserverEntry],
      {} as IntersectionObserver,
    );
    await Promise.resolve();
  });
};
const props = {
  labels: ['Monitors'],
  values: [2],
  unit: '',
  messages: {
    loading: 'Loading chart',
    error: 'Chart failed; use the table',
    retry: 'Retry chart',
  },
};

describe('deferred inventory charts', () => {
  it('ignores a late chart import after authentication changes before unmount', async () => {
    const gate = deferred<void>();
    mocks.gate = gate.promise;
    const { InventoryChart } = await import('./index');
    render(<InventoryChart {...props} />);
    await enter();
    void act(() => invalidateAuth());
    await act(async () => {
      gate.resolve();
      await gate.promise;
    });
    expect(mocks.mount).not.toHaveBeenCalled();
  });
  it('waits for visibility, creates once, and destroys on unmount', async () => {
    const dispose = vi.fn();
    mocks.mount.mockReturnValue(dispose);
    const { InventoryChart } = await import('./index');
    const view = render(<InventoryChart {...props} />);
    expect(mocks.mount).not.toHaveBeenCalled();
    await enter();
    await waitFor(() => expect(mocks.mount).toHaveBeenCalledOnce());
    expect(screen.queryByText('Loading chart')).not.toBeInTheDocument();
    await enter();
    expect(mocks.mount).toHaveBeenCalledOnce();
    view.unmount();
    expect(dispose).toHaveBeenCalledOnce();
    expect(disconnects[0]).toHaveBeenCalled();
  });
  it('ignores an import that resolves after leaving the page', async () => {
    const gate = deferred<void>();
    mocks.gate = gate.promise;
    const { InventoryChart } = await import('./index');
    const view = render(<InventoryChart {...props} />);
    await enter();
    view.unmount();
    await act(async () => {
      gate.resolve();
      await gate.promise;
    });
    expect(mocks.mount).not.toHaveBeenCalled();
  });
  it('keeps a recoverable error after a render failure', async () => {
    mocks.mount
      .mockImplementationOnce(() => {
        throw new Error('Canvas unavailable');
      })
      .mockReturnValue(vi.fn());
    const { InventoryChart } = await import('./index');
    render(<InventoryChart {...props} />);
    await enter();
    expect(await screen.findByRole('alert')).toHaveTextContent('use the table');
    fireEvent.click(screen.getByRole('button', { name: 'Retry chart' }));
    await enter();
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
    expect(mocks.mount).toHaveBeenCalledTimes(2);
  });
  it('bounds a stalled import and ignores its late result', async () => {
    vi.useFakeTimers();
    const gate = deferred<void>();
    mocks.gate = gate.promise;
    const { InventoryChart } = await import('./index');
    render(<InventoryChart {...props} />);
    await enter();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(12_000);
    });
    expect(screen.getByRole('alert')).toHaveTextContent('use the table');
    await act(async () => {
      gate.resolve();
      await gate.promise;
    });
    expect(mocks.mount).not.toHaveBeenCalled();
  });
});

function render(node: ReactNode) {
  return renderUi(node, { wrapper: TestAuth });
}
