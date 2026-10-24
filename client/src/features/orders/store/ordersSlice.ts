import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import type { OrderDetails, OrderSummary } from '@/shared/api/types';
import {
  idleLoadable,
  type Loadable,
  loadingFailed,
  loadingStarted,
  loadingSucceeded,
} from '@/shared/store/loadable';

import { getOrder, getOrders } from '../api/orders';

export interface OrdersState {
  /** The list on the left; `data` is the answer for the latest search that finished. */
  list: Loadable<OrderSummary[]>;
  /** The order of the open panel; `orderId` is the one the latest request asked for. */
  details: Loadable<OrderDetails> & { orderId: number | undefined };
}

/** The part of the root state this feature reads: the app mounts the reducer under `orders`. */
export interface OrdersRootState {
  orders: OrdersState;
}

const initialState: OrdersState = {
  list: idleLoadable(),
  details: { ...idleLoadable(), orderId: undefined },
};

/** Loads the list for a search text (an empty text lists everything). */
export const fetchOrders = createAsyncThunk('orders/fetchList', (query: string, { signal }) =>
  getOrders(query, signal),
);

/** Loads one order with its products for the panel. */
export const fetchOrder = createAsyncThunk('orders/fetchOne', (id: number, { signal }) =>
  getOrder(id, signal),
);

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
        loadingSucceeded(state.list, meta.requestId, payload);
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
      });
  },
});

export const ordersReducer = ordersSlice.reducer;

export const selectOrdersList = (state: OrdersRootState) => state.orders.list;
export const selectOrderDetails = (state: OrdersRootState) => state.orders.details;
