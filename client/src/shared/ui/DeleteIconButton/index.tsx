import './DeleteIconButton.scss';

import { TrashIcon } from '../icons';

interface DeleteIconButtonProps {
  /** What the button deletes, for screen readers: "Удалить приход Order 1". */
  label: string;
  onClick: () => void;
}

/** The trash icon of a row. It only asks for the deletion; the confirmation window decides. */
export function DeleteIconButton({ label, onClick }: DeleteIconButtonProps) {
  return (
    <button type="button" className="delete-icon-button" onClick={onClick} aria-label={label}>
      <TrashIcon />
    </button>
  );
}
