import './ConfirmDialog.scss';

import type { ReactNode } from 'react';

import { Button } from '../Button';
import { TrashIcon } from '../icons';
import { Modal } from '../Modal';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  /** Escape, the backdrop, the cross or "Отменить". */
  onClose: () => void;
  onConfirm: () => void;
  /** The request is on its way: the buttons are disabled. */
  pending: boolean;
  /** Why the deletion failed; the window stays open so the visitor can try again or cancel. */
  error?: string;
  /** What is going to be deleted: usually an `ItemSummary`. */
  children: ReactNode;
}

/**
 * The "are you sure?" window of a deletion, as in the design. It stays mounted and is driven by `open` (see Modal),
 * so keep it outside of the list row it belongs to: the row disappears when the deletion succeeds, the window
 * must still play its closing animation.
 */
export function ConfirmDialog({
  open,
  title,
  onClose,
  onConfirm,
  pending,
  error,
  children,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={onClose}
      actions={
        <>
          <Button variant="text" onClick={onClose}>
            Отменить
          </Button>
          <Button variant="light-danger" onClick={onConfirm} disabled={pending}>
            <TrashIcon />
            {pending ? 'Удаление…' : 'Удалить'}
          </Button>
        </>
      }
    >
      {children}
      {error !== undefined && (
        <p className="confirm-dialog__error" role="alert">
          Не удалось удалить{error ? `: ${error}` : '.'}
        </p>
      )}
    </Modal>
  );
}
