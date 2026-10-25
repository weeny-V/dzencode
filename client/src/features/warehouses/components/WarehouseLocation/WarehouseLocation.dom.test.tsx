import { act, fireEvent, render as renderUi, screen, waitFor } from '@testing-library/react';
import type { ComponentProps, ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { invalidateAuth } from '@/shared/lib/authLifecycle';
import { TestAuth } from '@/testing/auth';
import { deferred } from '@/testing/fixtures';

import { WarehouseLocation as WarehouseLocationClient } from './index';
import messages from './messages/ru.json';
function WarehouseLocation(
  props: Omit<ComponentProps<typeof WarehouseLocationClient>, 'messages'>,
) {
  return <WarehouseLocationClient {...props} messages={messages} />;
}

const mocks = vi.hoisted(() => ({
  load: vi.fn(),
  mount: vi.fn(),
  gate: undefined as Promise<void> | undefined,
}));
vi.mock('../../api/mapLoader', () => ({ loadMapRuntime: mocks.load }));
const warehouse = {
  id: 1,
  code: 'DEMO',
  name: 'Warehouse A',
  address: 'Demo address A',
  latitude: 50,
  longitude: 30,
};
beforeEach(() => {
  mocks.mount.mockReset();
  mocks.load.mockReset();
  mocks.gate = undefined;
  mocks.load.mockImplementation(async () => {
    await mocks.gate;
    return { mountWarehouseMap: mocks.mount };
  });
});
afterEach(() => vi.useRealTimers());

describe('warehouse map lifecycle', () => {
  it('does not mount or request tiles when an import resolves after authentication changes', async () => {
    const gate = deferred<void>();
    mocks.gate = gate.promise;
    render(<WarehouseLocation warehouse={warehouse} />);
    fireEvent.click(screen.getByRole('button', { name: 'Показать карту' }));
    void act(() => invalidateAuth());
    await act(async () => {
      gate.resolve();
      await gate.promise;
    });
    expect(mocks.mount).not.toHaveBeenCalled();
  });
  it('does not import a library for unassigned orders or before the explicit request', async () => {
    const view = render(<WarehouseLocation warehouse={null} />);
    expect(screen.getByText('Склад не назначен')).toBeVisible();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    view.rerender(<WarehouseLocation warehouse={warehouse} />);
    expect(screen.getByText('Demo address A')).toBeVisible();
    await act(async () => {});
    expect(mocks.load).not.toHaveBeenCalled();
  });
  it('destroys the map on hide and opens a fresh instance on reopen', async () => {
    const dispose = vi.fn();
    mocks.mount.mockReturnValue(dispose);
    render(<WarehouseLocation warehouse={warehouse} />);
    fireEvent.click(screen.getByRole('button', { name: 'Показать карту' }));
    await waitFor(() => expect(mocks.mount).toHaveBeenCalledOnce());
    fireEvent.click(screen.getByRole('button', { name: 'Скрыть карту' }));
    expect(dispose).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: 'Показать карту' }));
    await waitFor(() => expect(mocks.mount).toHaveBeenCalledTimes(2));
  });
  it('ignores late imports after switching orders and resetting the panel key', async () => {
    const gate = deferred<void>();
    mocks.gate = gate.promise;
    const view = render(<WarehouseLocation key={1} warehouse={warehouse} />);
    fireEvent.click(screen.getByRole('button', { name: 'Показать карту' }));
    view.rerender(
      <WarehouseLocation key={2} warehouse={{ ...warehouse, id: 2, name: 'Warehouse B' }} />,
    );
    await act(async () => {
      gate.resolve();
      await gate.promise;
    });
    expect(mocks.mount).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Показать карту' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(screen.getByText('Warehouse B')).toBeVisible();
  });
  it('recovers from tile failure while preserving the address', async () => {
    const dispose = vi.fn();
    let tileError: () => void = () => {};
    mocks.mount.mockImplementation((_target, _warehouse, _ready, fail: () => void) => {
      tileError = fail;
      return dispose;
    });
    render(<WarehouseLocation warehouse={warehouse} />);
    fireEvent.click(screen.getByRole('button', { name: 'Показать карту' }));
    await waitFor(() => expect(mocks.mount).toHaveBeenCalledOnce());
    void act(() => tileError());
    expect(dispose).toHaveBeenCalledOnce();
    expect(screen.getByRole('alert')).toBeVisible();
    expect(screen.getByText('Demo address A')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Повторить загрузку карты' }));
    await waitFor(() => expect(mocks.mount).toHaveBeenCalledTimes(2));
  });
  it('bounds stalled imports and avoids mounting them after timeout', async () => {
    vi.useFakeTimers();
    const gate = deferred<void>();
    mocks.gate = gate.promise;
    render(<WarehouseLocation warehouse={warehouse} />);
    fireEvent.click(screen.getByRole('button', { name: 'Показать карту' }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(12_000);
    });
    expect(screen.getByRole('alert')).toBeVisible();
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
