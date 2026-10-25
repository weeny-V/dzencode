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
vi.mock('./graphLoader', () => ({ loadGraphRuntime: mocks.load }));
let callbacks: IntersectionObserverCallback[];
beforeEach(() => {
  mocks.mount.mockReset();
  mocks.gate = undefined;
  mocks.load.mockImplementation(async () => {
    await mocks.gate;
    return { mountInventoryGraph: mocks.mount };
  });
  callbacks = [];
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      disconnect = vi.fn();
      observe = vi.fn();
      constructor(callback: IntersectionObserverCallback) {
        callbacks.push(callback);
      }
    },
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
const enter = async () => {
  await act(async () => {
    callbacks[callbacks.length - 1](
      [{ isIntersecting: true } as IntersectionObserverEntry],
      {} as IntersectionObserver,
    );
    await Promise.resolve();
  });
};
const controller = () => ({ zoomBy: vi.fn(), fit: vi.fn(), dispose: vi.fn() });
const props = {
  nodes: [
    { id: 'warehouse:1', kind: 'WAREHOUSE' as const, label: 'Kyiv', productsCount: 1 },
    { id: 'order:1', kind: 'ORDER' as const, label: 'Order A', productsCount: 1 },
  ],
  edges: [{ id: 'e', source: 'warehouse:1', target: 'order:1', productsCount: 1 }],
  messages: {
    loading: 'Loading graph',
    error: 'Graph failed; use the table',
    retry: 'Retry graph',
    zoomIn: 'Zoom in',
    zoomOut: 'Zoom out',
    fit: 'Fit to view',
    controls: 'Graph controls',
    hint: 'Drag to move',
  },
};

describe('deferred relations graph', () => {
  it('loads nothing before it is visible, mounts once, and disposes on unmount', async () => {
    const mounted = controller();
    mocks.mount.mockReturnValue(mounted);
    const { InventoryGraph } = await import('./index');
    const view = render(<InventoryGraph {...props} />);
    expect(mocks.load).not.toHaveBeenCalled();
    await enter();
    await waitFor(() => expect(mocks.mount).toHaveBeenCalledOnce());
    expect(mocks.mount).toHaveBeenCalledWith(expect.any(HTMLElement), props.nodes, props.edges);
    expect(screen.queryByText('Loading graph')).not.toBeInTheDocument();
    view.unmount();
    expect(mounted.dispose).toHaveBeenCalledOnce();
  });
  it('drives zoom and fit through the mounted controller', async () => {
    const mounted = controller();
    mocks.mount.mockReturnValue(mounted);
    const { InventoryGraph } = await import('./index');
    render(<InventoryGraph {...props} />);
    await enter();
    fireEvent.click(await screen.findByRole('button', { name: 'Zoom in' }));
    fireEvent.click(screen.getByRole('button', { name: 'Zoom out' }));
    fireEvent.click(screen.getByRole('button', { name: 'Fit to view' }));
    expect(mounted.zoomBy).toHaveBeenNthCalledWith(1, 1.25);
    expect(mounted.zoomBy).toHaveBeenNthCalledWith(2, 0.8);
    expect(mounted.fit).toHaveBeenCalledOnce();
  });
  it('ignores a late import after authentication changes', async () => {
    const gate = deferred<void>();
    mocks.gate = gate.promise;
    const { InventoryGraph } = await import('./index');
    render(<InventoryGraph {...props} />);
    await enter();
    void act(() => invalidateAuth());
    await act(async () => {
      gate.resolve();
      await gate.promise;
    });
    expect(mocks.mount).not.toHaveBeenCalled();
  });
  it('keeps a recoverable error and retries', async () => {
    mocks.mount
      .mockImplementationOnce(() => {
        throw new Error('Canvas unavailable');
      })
      .mockReturnValue(controller());
    const { InventoryGraph } = await import('./index');
    render(<InventoryGraph {...props} />);
    await enter();
    expect(await screen.findByRole('alert')).toHaveTextContent('use the table');
    fireEvent.click(screen.getByRole('button', { name: 'Retry graph' }));
    await enter();
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
    expect(mocks.mount).toHaveBeenCalledTimes(2);
  });
  it('bounds a stalled import', async () => {
    vi.useFakeTimers();
    const gate = deferred<void>();
    mocks.gate = gate.promise;
    const { InventoryGraph } = await import('./index');
    render(<InventoryGraph {...props} />);
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
