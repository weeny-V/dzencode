import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type DeleteTarget = {
  id: number;
  title: string;
  meta: string;
} & ({ kind: 'order' } | { kind: 'product'; orderId: number });

interface ConfirmationState {
  open: boolean;
  target: DeleteTarget | undefined;
}

const initialState: ConfirmationState = { open: false, target: undefined };
const slice = createSlice({
  name: 'confirmation',
  initialState,
  reducers: {
    askDelete(state, action: PayloadAction<DeleteTarget>) {
      state.target = action.payload;
      state.open = true;
    },
    closeDelete(state) {
      // Preserve the summary while the dialog plays its exit animation.
      state.open = false;
    },
  },
});

export const { askDelete, closeDelete } = slice.actions;
export const confirmationReducer = slice.reducer;
export const selectConfirmation = (state: { confirmation: ConfirmationState }) =>
  state.confirmation;
