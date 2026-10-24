import './FormLayout.scss';

import type { FormEventHandler, ReactNode } from 'react';

import { Button, ButtonLink } from '../Button';
import { PageHeader } from '../PageHeader';

interface FormLayoutProps {
  title: string;
  onSubmit: FormEventHandler<HTMLFormElement>;
  /** The request is on its way: the submit button is disabled so the form cannot be sent twice. */
  submitting: boolean;
  submitLabel: string;
  /** Where "Отмена" leads. */
  cancelHref: string;
  /** Why the whole form was refused (the server's answer, a lost connection). Field errors sit under their fields. */
  error?: string;
  children: ReactNode;
}

/** The frame of a form page: the title, a white card with the fields, the error of the whole form and the buttons. */
export function FormLayout({
  title,
  onSubmit,
  submitting,
  submitLabel,
  cancelHref,
  error,
  children,
}: FormLayoutProps) {
  return (
    <>
      <PageHeader title={title} />

      {/* The browser's own validation is off: the schema of the form checks and words the errors. */}
      <form className="form-layout" onSubmit={onSubmit} noValidate aria-busy={submitting}>
        <div className="form-layout__fields">{children}</div>

        {error && (
          <p className="form-layout__error" role="alert">
            {error}
          </p>
        )}

        <div className="form-layout__actions">
          <ButtonLink href={cancelHref} variant="ghost">
            Отмена
          </ButtonLink>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Сохранение…' : submitLabel}
          </Button>
        </div>
      </form>
    </>
  );
}
