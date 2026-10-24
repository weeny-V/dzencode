import { configureStore } from '@reduxjs/toolkit';

import { ordersReducer } from '@/features/orders';
import { productsReducer } from '@/features/products';

/** Every feature mounts its reducer under its own name; the feature reads it back through its own selectors. */
export const makeStore = () =>
  configureStore({
    reducer: { orders: ordersReducer, products: productsReducer },
  });

export type AppStore = ReturnType<typeof makeStore>;
