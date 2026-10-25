'use client';

import { useAppDispatch } from '@/shared/store/hooks';
import { DeleteIconButton } from '@/shared/ui/DeleteIconButton';

import { askDelete, type DeleteTarget } from '../../store/confirmationSlice';

/** The only client island inside a server-rendered inventory row. */
export function DeleteButton({ target, label }: { target: DeleteTarget; label: string }) {
  const dispatch = useAppDispatch();
  return <DeleteIconButton label={label} onClick={() => dispatch(askDelete(target))} />;
}
