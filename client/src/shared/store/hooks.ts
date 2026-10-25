import type { Dispatch, UnknownAction } from '@reduxjs/toolkit';
import { useDispatch } from 'react-redux';

/** Client-state actions only. Selectors are typed by the slice that owns them. */
export type AppDispatch = Dispatch<UnknownAction>;

export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
