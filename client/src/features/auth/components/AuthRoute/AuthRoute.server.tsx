import { redirect } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';

import { ApiError } from '@/shared/api/errors';
import { readSession } from '@/shared/api/session.server';
import { safeReturnTo } from '@/shared/lib/authRedirect';
import type { SearchParams } from '@/shared/lib/searchParams';

import { AuthForm } from '../AuthForm';
import { dictionary } from '../AuthForm/messages.server';

export async function authMetadata(mode: 'login' | 'register') {
  const { messages } = await dictionary();
  return { title: messages[mode] };
}

export async function AuthRoute({
  mode,
  searchParams,
}: {
  mode: 'login' | 'register';
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const returnTo = safeReturnTo(params.returnTo);
  try {
    await readSession();
    redirect(returnTo);
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 401)) throw error;
  }
  const { locale, messages } = await dictionary();
  return (
    <NextIntlClientProvider locale={locale} messages={{ AuthForm: messages }}>
      <AuthForm key={mode} mode={mode} returnTo={returnTo} />
    </NextIntlClientProvider>
  );
}
