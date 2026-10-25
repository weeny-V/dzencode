import type { ReactNode } from 'react';
import { Provider } from 'react-redux';

import { makeStore } from '@/app/store';
import { render, TestLocale } from '@/testing/i18n';

export function renderWithStore(ui: ReactNode, store = makeStore()) {
  return {
    ...render(ui, {
      wrapper: ({ children }) => (
        <TestLocale>
          <Provider store={store}>{children}</Provider>
        </TestLocale>
      ),
    }),
    store,
  };
}
