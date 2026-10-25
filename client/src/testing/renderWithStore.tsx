import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { Provider } from 'react-redux';

import { makeStore } from '@/app/store';

export function renderWithStore(ui: ReactNode, store = makeStore()) {
  return {
    ...render(ui, { wrapper: ({ children }) => <Provider store={store}>{children}</Provider> }),
    store,
  };
}
