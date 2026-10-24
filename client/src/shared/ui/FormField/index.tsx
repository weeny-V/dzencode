import './FormField.scss';

import { type ReactNode, useId } from 'react';

/** What a control needs to be tied to its label and its error message. Spread it on the `<input>`. */
export interface FieldControlProps {
  id: string;
  /** The look of a text control (`input`, `select`, `textarea`). */
  className: string;
  'aria-invalid': true | undefined;
  'aria-describedby': string | undefined;
}

interface FormFieldProps {
  label: string;
  /** The message under the control; the control is marked invalid when it is set. */
  error?: string;
  /** A quiet hint under the control, shown while there is no error. */
  hint?: string;
  /** Marks the label with an asterisk. The browser's own validation is off (`noValidate`), the schema checks. */
  required?: boolean;
  /** Takes the whole row of the form grid instead of one column. */
  wide?: boolean;
  children: (control: FieldControlProps) => ReactNode;
}

/** A label, a control and the error under it, wired together with ids for screen readers. */
export function FormField({ label, error, hint, required, wide, children }: FormFieldProps) {
  const id = useId();
  const messageId = `${id}-message`;
  const message = error ?? hint;

  return (
    <div className={`field${wide ? ' field--wide' : ''}`}>
      <label className="field__label" htmlFor={id}>
        {label}
        {required && (
          <span className="field__required" aria-hidden="true">
            {' '}
            *
          </span>
        )}
      </label>
      {children({
        id,
        className: 'field__control',
        'aria-invalid': error ? true : undefined,
        'aria-describedby': message ? messageId : undefined,
      })}
      {message && (
        <p
          id={messageId}
          className={`field__message${error ? ' field__message--error' : ''}`}
          role={error ? 'alert' : undefined}
        >
          {message}
        </p>
      )}
    </div>
  );
}

interface CheckboxFieldProps {
  label: string;
  children: (control: { id: string; className: string }) => ReactNode;
}

/** A checkbox with its label to the right, in a row of the form grid. */
export function CheckboxField({ label, children }: CheckboxFieldProps) {
  const id = useId();

  return (
    <div className="field field--wide">
      <div className="field__check">
        {children({ id, className: 'field__checkbox' })}
        <label htmlFor={id}>{label}</label>
      </div>
    </div>
  );
}
