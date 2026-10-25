'use server';
import { cookies } from 'next/headers';

import { LOCALE_COOKIE, resolveLocale } from './config';
export async function getSavedLocale() {
  return resolveLocale((await cookies()).get(LOCALE_COOKIE)?.value);
}
