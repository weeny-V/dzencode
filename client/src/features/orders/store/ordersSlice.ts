import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import type { NewOrder, OrderDetails, OrderSummary } from '@/shared/api/types';
import {
  idleLoadable,
  type Loadable,
  loadingFailed,
  loadingStarted,
  loadingSucceeded,
} from '@/shared/store/loadable';

import { getOrder, getOrders, postOrder, removeOrder } from '../api/orders';

export interface OrdersState {
  /** The list on the left; `data` is the answer for the latest search that finished. */
  list: Loadable<OrderSummary[]>;
  /** The order of the open panel; `orderId` is the one the latest request asked for. */
  details: Loadable<OrderDetails> & { orderId: number | undefined };
  /**
   * Orders deleted in this visit. A list request that started before a deletion may still answer after it with
   * the old rows; ids are never reused, so the answer is simply cleaned of these.
   */
  deletedIds: number[];
}

/** The part of the root state this feature reads: the app mounts the reducer under `orders`. */
export interface OrdersRootState {
  orders: OrdersState;
}

const initialState: OrdersState = {
  list: idleLoadable(),
  details: { ...idleLoadable(), orderId: undefined },
  deletedIds: [],
};

/** Loads the list for a search text (an empty text lists everything). */
export const fetchOrders = createAsyncThunk('orders/fetchList', (query: string, { signal }) =>
  getOrders(query, signal),
);

/** Loads one order with its products for the panel. */
export const fetchOrder = createAsyncThunk('orders/fetchOne', (id: number, { signal }) =>
  getOrder(id, signal),
);

/** Creates an order. The list and the panel are not touched: the page that follows loads them fresh. */
export const createOrder = createAsyncThunk('orders/create', (order: NewOrder, { signal }) =>
  postOrder(order, signal),
);

/** Deletes an order; the answer is its id, so the reducers know which one to drop. */
export const deleteOrder = createAsyncThunk('orders/delete', async (id: number, { signal }) => {
  await removeOrder(id, signal);
  return id;
});

const ordersSlice = createSlice({
  name: 'orders',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchOrders.pending, (state, { meta }) => {
        loadingStarted(state.list, meta.requestId);
      })
      .addCase(fetchOrders.fulfilled, (state, { meta, payload }) => {
        const deleted = state.deletedIds;
        loadingSucceeded(
          state.list,
          meta.requestId,
          payload.filter((order) => !deleted.includes(order.id)),
        );
      })
      .addCase(fetchOrders.rejected, (state, { meta, error }) => {
        loadingFailed(state.list, meta, error.message);
      })
      .addCase(fetchOrder.pending, (state, { meta }) => {
        loadingStarted(state.details, meta.requestId);
        state.details.orderId = meta.arg;
      })
      .addCase(fetchOrder.fulfilled, (state, { meta, payload }) => {
        loadingSucceeded(state.details, meta.requestId, payload);
      })
      .addCase(fetchOrder.rejected, (state, { meta, error }) => {
        loadingFailed(state.details, meta, error.message);
      })
      .addCase(deleteOrder.fulfilled, (state, { payload: id }) => {
        // The row leaves at once instead of waiting for the next load of the list.
        state.deletedIds.push(id);
        state.list.data = state.list.data?.filter((order) => order.id !== id);
        if (state.details.orderId === id) {
          // Forgets the order and any answer about it that is still on its way (it no longer matches `requestId`).
          state.details = { ...idleLoadable(), orderId: undefined };
        }
      });
  },
});

export const ordersReducer = ordersSlice.reducer;

export const selectOrdersList = (state: OrdersRootState) => state.orders.list;
export const selectOrderDetails = (state: OrdersRootState) => state.orders.details;
