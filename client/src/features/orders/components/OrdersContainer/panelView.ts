import type { OrdersState } from '../../store/ordersSlice';
import type { PanelView } from '../OrderPanel';

/**
 * What the panel of order `selectedId` shows, given the store's order slot. The slot may still describe another
 * order (the one opened before), so only an answer about this order counts. A failed reload comes before the
 * data kept from an earlier load: the visitor must see the error and the retry button, not stale products.
 */
export const panelView = (
  selectedId: number | undefined,
  details: OrdersState['details'],
): PanelView | undefined => {
  if (selectedId === undefined) return undefined;
  if (details.status === 'failed' && details.orderId === selectedId) {
    return { status: 'error', message: details.error ?? '' };
  }
  if (details.data?.id === selectedId) return { status: 'ready', order: details.data };
  return { status: 'loading' };
};
