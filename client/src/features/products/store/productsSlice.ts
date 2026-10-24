import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import type { NewProduct, Product } from '@/shared/api/types';
import {
  idleLoadable,
  type Loadable,
  loadingFailed,
  loadingStarted,
  loadingSucceeded,
} from '@/shared/store/loadable';

import {
  getOrderOptions,
  getProducts,
  getProductTypes,
  type OrderOption,
  postProduct,
  type ProductsFilter,
  removeProduct,
} from '../api/products';

export interface ProductsState {
  /** The table; `data` is the answer for the latest filter that finished. */
  list: Loadable<Product[]>;
  /** Names for the type filter; they change rarely, so they are loaded once. */
  types: Loadable<string[]>;
  /** The orders a product can be added to (the select of the product form). */
  orderOptions: Loadable<OrderOption[]>;
  /** Products deleted in this visit: a table request that started earlier must not bring them back. */
  deletedIds: number[];
}

/** The part of the root state this feature reads: the app mounts the reducer under `products`. */
export interface ProductsRootState {
  products: ProductsState;
}

const initialState: ProductsState = {
  list: idleLoadable(),
  types: idleLoadable(),
  orderOptions: idleLoadable(),
  deletedIds: [],
};

/** Loads the table for a type and a search text. */
export const fetchProducts = createAsyncThunk(
  'products/fetchList',
  (filter: ProductsFilter, { signal }) => getProducts(filter, signal),
);

/** Loads the type names. Skipped when they are loaded already or on their way. */
export const fetchProductTypes = createAsyncThunk(
  'products/fetchTypes',
  (_: void, { signal }) => getProductTypes(signal),
  {
    condition: (_, { getState }) => {
      const { status } = (getState() as ProductsRootState).products.types;
      return status !== 'loading' && status !== 'succeeded';
    },
  },
);

/** Loads the orders for the select of the product form; the form needs them fresh, so there is no `condition`. */
export const fetchOrderOptions = createAsyncThunk(
  'products/fetchOrderOptions',
  (_: void, { signal }) => getOrderOptions(signal),
);

/** Creates a product. The page that follows loads the lists fresh. */
export const createProduct = createAsyncThunk(
  'products/create',
  (product: NewProduct, { signal }) => postProduct(product, signal),
);

/** Deletes a product; the answer is its id, so the reducers know which one to drop. */
export const deleteProduct = createAsyncThunk('products/delete', async (id: number, { signal }) => {
  await removeProduct(id, signal);
  return id;
});

const productsSlice = createSlice({
  name: 'products',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchProducts.pending, (state, { meta }) => {
        loadingStarted(state.list, meta.requestId);
      })
      .addCase(fetchProducts.fulfilled, (state, { meta, payload }) => {
        const deleted = state.deletedIds;
        loadingSucceeded(
          state.list,
          meta.requestId,
          payload.filter((product) => !deleted.includes(product.id)),
        );
      })
      .addCase(fetchProducts.rejected, (state, { meta, error }) => {
        loadingFailed(state.list, meta, error.message);
      })
      .addCase(fetchProductTypes.pending, (state, { meta }) => {
        loadingStarted(state.types, meta.requestId);
      })
      .addCase(fetchProductTypes.fulfilled, (state, { meta, payload }) => {
        loadingSucceeded(state.types, meta.requestId, payload);
      })
      .addCase(fetchProductTypes.rejected, (state, { meta, error }) => {
        loadingFailed(state.types, meta, error.message);
      })
      .addCase(fetchOrderOptions.pending, (state, { meta }) => {
        loadingStarted(state.orderOptions, meta.requestId);
      })
      .addCase(fetchOrderOptions.fulfilled, (state, { meta, payload }) => {
        loadingSucceeded(state.orderOptions, meta.requestId, payload);
      })
      .addCase(fetchOrderOptions.rejected, (state, { meta, error }) => {
        loadingFailed(state.orderOptions, meta, error.message);
      })
      .addCase(deleteProduct.fulfilled, (state, { payload: id }) => {
        // The row leaves at once instead of waiting for the next load of the table.
        state.deletedIds.push(id);
        state.list.data = state.list.data?.filter((product) => product.id !== id);
      });
  },
});

export const productsReducer = productsSlice.reducer;

export const selectProductsList = (state: ProductsRootState) => state.products.list;
export const selectProductTypes = (state: ProductsRootState) => state.products.types;
export const selectOrderOptions = (state: ProductsRootState) => state.products.orderOptions;
