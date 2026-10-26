'use client';

import './AuthForm.scss';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import type { UseFormRegisterReturn } from 'react-hook-form';

import { useHydrated } from '@/shared/hooks/useHydrated';
import { Button } from '@/shared/ui/Button';
import { type FieldControlProps, FormField } from '@/shared/ui/FormField';
import { EyeIcon, EyeOffIcon } from '@/shared/ui/icons';

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
        <PasswordField
          label={t('passwordLabel')}
          error={errors.password?.message ? t(errors.password.message) : undefined}
          field={register('password')}
          autoComplete={registering ? 'new-password' : 'current-password'}
        />
        {registering && (
          <PasswordField
            label={t('passwordConfirmation')}
            error={
              errors.passwordConfirmation?.message
                ? t(errors.passwordConfirmation.message)
                : undefined
            }
            field={register('passwordConfirmation')}
            autoComplete="new-password"
          />
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
        // A pointer press must not blur the field: its error would push the link away before the click lands.
        onMouseDown={(event) => event.preventDefault()}
        href={(registering ? '/login' : '/register') + '?returnTo=' + encodeURIComponent(returnTo)}
      >
        {t(registering ? 'loginLink' : 'registerLink')}
      </Link>
    </section>
  );
}

function PasswordField({
  label,
  error,
  field,
  autoComplete,
}: {
  label: string;
  error?: string;
  field: UseFormRegisterReturn<'password' | 'passwordConfirmation'>;
  autoComplete: 'new-password' | 'current-password';
}) {
  return (
    <FormField label={label} required error={error}>
      {(control) => <PasswordInput control={control} field={field} autoComplete={autoComplete} />}
    </FormField>
  );
}

function PasswordInput({
  control,
  field,
  autoComplete,
}: {
  control: FieldControlProps;
  field: UseFormRegisterReturn<'password' | 'passwordConfirmation'>;
  autoComplete: 'new-password' | 'current-password';
}) {
  const t = useTranslations('AuthForm');
  const [visible, setVisible] = useState(false);
  const confirmation = field.name === 'passwordConfirmation';
  const toggleLabel = confirmation
    ? t(visible ? 'hidePasswordConfirmation' : 'showPasswordConfirmation')
    : t(visible ? 'hidePassword' : 'showPassword');
  return (
    <div className="auth-form__password">
      <input
        {...control}
        {...field}
        style={{ paddingInlineEnd: 'var(--auth-password-toggle-size)' }}
        type={visible ? 'text' : 'password'}
        autoComplete={autoComplete}
      />
      <button
        type="button"
        className="auth-form__password-toggle"
        aria-label={toggleLabel}
        aria-controls={control.id}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => setVisible((current) => !current)}
      >
        {visible ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </div>
  );
}
