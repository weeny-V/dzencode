'use client';

import { type ReactNode, useState } from 'react';
import { Provider } from 'react-redux';

import { makeStore } from './store';

/**
 * Gives the components the Redux store. The store is created inside the component (once per mount), not at
 * module level: the server renders many visitors with one module instance, and they must not share state.
 */
export function StoreProvider({ children }: { children: ReactNode }) {
  const [store] = useState(makeStore);

  return <Provider store={store}>{children}</Provider>;
}
