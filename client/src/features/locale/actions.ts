'use server';
import { cookies } from 'next/headers';

import { isLocale, LOCALE_COOKIE } from '@/shared/i18n/config';
export async function setLocale(locale: string): Promise<void> {
  if (!isLocale(locale)) throw new Error('Unsupported locale');
  (await cookies()).set(LOCALE_COOKIE, locale, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  });
}
