import { configureStore } from '@reduxjs/toolkit';

import { confirmationReducer } from '@/features/confirmation';
import { sessionsReducer } from '@/features/sessions';

/** Every feature mounts its reducer under its own name; the feature reads it back through its own selectors. */
export const makeStore = () =>
  configureStore({
    reducer: { confirmation: confirmationReducer, sessions: sessionsReducer },
  });

export type AppStore = ReturnType<typeof makeStore>;
