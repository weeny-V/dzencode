'use client';

import './Modal.scss';

import { useTranslations } from 'next-intl';
import { type ReactNode, useEffect, useId, useRef } from 'react';

import { Button } from '../Button';
import { CloseIcon } from '../icons';

// If the closing animation never ends (for example the tab is in the background and the browser draws no
// frames), the window is closed anyway after this time. Keep it a bit longer than the animation in Modal.scss.
const CLOSE_FALLBACK_MS = 400;

interface ModalProps {
  /** Whether the window is shown. Setting it to `false` plays the closing animation, then closes the dialog. */
  open: boolean;
  title: string;
  /** Called when the visitor asks to close: Escape, a click on the backdrop, the cross. Set `open` to `false`. */
  onClose: () => void;
  /** Content under the title. */
  children?: ReactNode;
  /** The green bar at the bottom: buttons. */
  actions?: ReactNode;
}

/**
 * A modal window on the native `<dialog>` element: the browser traps focus, closes it on Escape and dims the page.
 * The component stays mounted and is driven by `open`: opening and closing are CSS animations (see Modal.scss),
 * so the window and the dimmed backdrop fade and move in both directions, whatever opens them.
 */
export function Modal({ open, title, onClose, children, actions }: ModalProps) {
  const t = useTranslations('Modal');
  const titleId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  // A click counts as "on the backdrop" only if the press started there too: selecting text inside the window
  // and releasing the mouse outside must not close it.
  const pressedOnBackdrop = useRef(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      // `open` as an attribute would not make the dialog modal, so open it through the API.
      if (!dialog.open) dialog.showModal();
      return;
    }
    if (!dialog.open) return;

    // Closing: play the exit animation (the `data-closing` rule in Modal.scss), then close for real.
    // The attribute is set on the DOM directly: it is a transient animation state, not part of the React tree.
    dialog.dataset.closing = 'true';
    const finish = () => {
      dialog.close();
      delete dialog.dataset.closing;
    };
    const onAnimationEnd = (event: AnimationEvent) => {
      // Animations of the children bubble up as well; only the dialog's own one ends the closing.
      if (event.target === dialog) finish();
    };
    dialog.addEventListener('animationend', onAnimationEnd);
    const fallback = setTimeout(finish, CLOSE_FALLBACK_MS);

    // Reopened during the exit animation, or unmounted: forget the pending close.
    return () => {
      clearTimeout(fallback);
      dialog.removeEventListener('animationend', onAnimationEnd);
      delete dialog.dataset.closing;
    };
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className="modal"
      aria-labelledby={titleId}
      onCancel={(event) => {
        // Handle Escape ourselves, so that the state and the DOM stay in step and the exit animation plays.
        event.preventDefault();
        onClose();
      }}
      // The browser can still close the dialog without a cancelable `cancel` event (a second Escape press
      // without user interaction in between). Then the native `close` event is the only signal. When we closed
      // it ourselves `open` is already false, so nothing is reported twice.
      onClose={() => {
        if (open) onClose();
      }}
      onPointerDown={(event) => {
        pressedOnBackdrop.current = event.target === event.currentTarget;
      }}
      onClick={(event) => {
        // A click on the backdrop lands on the <dialog> element itself, not on its content.
        if (pressedOnBackdrop.current && event.target === event.currentTarget) onClose();
        pressedOnBackdrop.current = false;
      }}
    >
      <div className="modal__window">
        <Button variant="icon" className="modal__close" onClick={onClose} aria-label={t('close')}>
          <CloseIcon />
        </Button>
        <h2 className="modal__title" id={titleId}>
          {title}
        </h2>
        {children && <div className="modal__body">{children}</div>}
        {actions && <div className="modal__actions">{actions}</div>}
      </div>
    </dialog>
  );
}
