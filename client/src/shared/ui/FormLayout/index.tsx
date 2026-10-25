import './FormLayout.scss';

import { useTranslations } from 'next-intl';
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
  onClear?: () => void;
  draftUnavailable?: boolean;
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
  onClear,
  draftUnavailable,
}: FormLayoutProps) {
  const t = useTranslations('FormLayout');
  return (
    <>
      <PageHeader title={title} />

      {/* The browser's own validation is off: the schema of the form checks and words the errors. */}
      <form className="form-layout" onSubmit={onSubmit} noValidate aria-busy={submitting}>
        <div className="form-layout__fields">{children}</div>

        {draftUnavailable && <p role="status">{t('unavailable')}</p>}
        {error && (
          <p className="form-layout__error" role="alert">
            {t('failed')}
          </p>
        )}

        <div className="form-layout__actions">
          {onClear && (
            <Button type="button" variant="ghost" disabled={submitting} onClick={onClear}>
              {t('clear')}
            </Button>
          )}
          <ButtonLink href={cancelHref} variant="ghost">
            {t('cancel')}
          </ButtonLink>
          <Button type="submit" disabled={submitting}>
            {submitting ? t('saving') : submitLabel}
          </Button>
        </div>
      </form>
    </>
  );
}
