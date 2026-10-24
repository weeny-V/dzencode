import type { ThunkDispatch, UnknownAction } from '@reduxjs/toolkit';
import { useDispatch } from 'react-redux';

/** `dispatch` that also accepts thunks (`createAsyncThunk` actions). Selectors are typed by the slice that owns them. */
export type AppDispatch = ThunkDispatch<unknown, undefined, UnknownAction>;

export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
