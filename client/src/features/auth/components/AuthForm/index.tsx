'use client';

import './AuthForm.scss';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { Button } from '@/shared/ui/Button';
import { FormField } from '@/shared/ui/FormField';

import { useAuthForm } from './useAuthForm';

export function AuthForm({ mode, returnTo }: { mode: 'login' | 'register'; returnTo: string }) {
  const t = useTranslations('AuthForm');
  const { form, error, submit } = useAuthForm(mode, returnTo);
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
            <input
              {...control}
              {...register('password')}
              type="password"
              autoComplete={registering ? 'new-password' : 'current-password'}
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
        <Button type="submit" disabled={isSubmitting}>
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
