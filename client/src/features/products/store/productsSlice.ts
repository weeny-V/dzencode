import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import type { Product } from '@/shared/api/types';
import {
  idleLoadable,
  type Loadable,
  loadingFailed,
  loadingStarted,
  loadingSucceeded,
} from '@/shared/store/loadable';

import { getProducts, getProductTypes, type ProductsFilter } from '../api/products';

export interface ProductsState {
  /** The table; `data` is the answer for the latest filter that finished. */
  list: Loadable<Product[]>;
  /** Names for the type filter; they change rarely, so they are loaded once. */
  types: Loadable<string[]>;
}

/** The part of the root state this feature reads: the app mounts the reducer under `products`. */
export interface ProductsRootState {
  products: ProductsState;
}

const initialState: ProductsState = { list: idleLoadable(), types: idleLoadable() };

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
        loadingSucceeded(state.list, meta.requestId, payload);
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
      });
  },
});

export const productsReducer = productsSlice.reducer;

export const selectProductsList = (state: ProductsRootState) => state.products.list;
export const selectProductTypes = (state: ProductsRootState) => state.products.types;
