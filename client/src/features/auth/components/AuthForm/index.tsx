'use client';

import './AuthForm.scss';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useId, useState } from 'react';
import type { UseFormRegisterReturn } from 'react-hook-form';

import { useHydrated } from '@/shared/hooks/useHydrated';
import { Button } from '@/shared/ui/Button';
import { type FieldControlProps, FormField } from '@/shared/ui/FormField';

import { useAuthForm } from './useAuthForm';

export function AuthForm({ mode, returnTo }: { mode: 'login' | 'register'; returnTo: string }) {
  const t = useTranslations('AuthForm');
  const { form, error, submit } = useAuthForm(mode, returnTo);
  // The form arrives as server HTML before its code is ready. A native submit at that moment would put the
  // credentials into the address, so sending is possible only once the page can handle it.
  const hydrated = useHydrated();
  const {
    register,
    formState: { errors, isSubmitting },
  } = form;
  const registering = mode === 'register';
  return (
    <section className="auth-form">
      <h1 className="auth-form__title">{t(mode)}</h1>
      <form
        className="auth-form__fields"
        method="post"
        onSubmit={(event) => void submit(event)}
        noValidate
        aria-busy={isSubmitting}
      >
        {registering && (
          <>
            <FormField
              label={t('firstName')}
              required
              error={errors.firstName?.message ? t(errors.firstName.message) : undefined}
            >
              {(control) => (
                <input {...control} {...register('firstName')} autoComplete="given-name" />
              )}
            </FormField>
            <FormField
              label={t('lastName')}
              required
              error={errors.lastName?.message ? t(errors.lastName.message) : undefined}
            >
              {(control) => (
                <input {...control} {...register('lastName')} autoComplete="family-name" />
              )}
            </FormField>
          </>
        )}
        <FormField
          label={t('emailLabel')}
          required
          error={errors.email?.message ? t(errors.email.message) : undefined}
        >
          {(control) => (
            <input
              {...control}
              {...register('email')}
              type="email"
              autoComplete="email"
              maxLength={254}
            />
          )}
        </FormField>
        <FormField
          label={t('passwordLabel')}
          required
          error={errors.password?.message ? t(errors.password.message) : undefined}
        >
          {(control) => (
            <PasswordInput
              control={control}
              field={register('password')}
              registering={registering}
            />
          )}
        </FormField>
        {registering && (
          <FormField
            label={t('passwordConfirmation')}
            required
            error={
              errors.passwordConfirmation?.message
                ? t(errors.passwordConfirmation.message)
                : undefined
            }
          >
            {(control) => (
              <input
                {...control}
                {...register('passwordConfirmation')}
                type="password"
                autoComplete="new-password"
              />
            )}
          </FormField>
        )}
        {error && (
          <p className="auth-form__error" role="alert">
            {t(error)}
          </p>
        )}
        <Button type="submit" disabled={isSubmitting || !hydrated}>
          {t(isSubmitting ? 'pending' : mode)}
        </Button>
      </form>
      <Link
        className="auth-form__alternate"
        href={(registering ? '/login' : '/register') + '?returnTo=' + encodeURIComponent(returnTo)}
      >
        {t(registering ? 'loginLink' : 'registerLink')}
      </Link>
    </section>
  );
}

/** Local help stays separate from validation and never moves focus away from the password. */
function PasswordInput({
  control,
  field,
  registering,
}: {
  control: FieldControlProps;
  field: UseFormRegisterReturn<'password'>;
  registering: boolean;
}) {
  const t = useTranslations('AuthForm');
  const hintId = useId();
  const [open, setOpen] = useState(false);
  const input = (
    <input
      {...control}
      {...field}
      style={registering ? { paddingInlineEnd: 'var(--auth-password-help-size)' } : undefined}
      aria-describedby={
        [control['aria-describedby'], registering ? hintId : undefined].filter(Boolean).join(' ') ||
        undefined
      }
      type="password"
      autoComplete={registering ? 'new-password' : 'current-password'}
    />
  );
  if (!registering) return input;

  return (
    <div
      className="auth-form__password"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={(event) => {
        if (!event.currentTarget.contains(event.currentTarget.ownerDocument.activeElement))
          setOpen(false);
      }}
      onFocus={() => setOpen(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && open) {
          event.preventDefault();
          event.stopPropagation();
          setOpen(false);
        }
      }}
    >
      {input}
      <button
        type="button"
        className="auth-form__password-help"
        aria-label={t('passwordRequirements')}
        aria-describedby={hintId}
        onClick={() => setOpen(true)}
      >
        <span className="auth-form__password-help-mark" aria-hidden="true">
          i
        </span>
      </button>
      <div id={hintId} role="tooltip" className="auth-form__password-hint" hidden={!open}>
        <ul className="auth-form__password-rules">
          <li>{t('passwordMinimum')}</li>
          <li>{t('passwordMaximum')}</li>
          <li>{t('passwordCharacters')}</li>
        </ul>
      </div>
    </div>
  );
}
