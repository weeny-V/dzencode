import 'server-only';

import { createTranslator } from 'next-intl';
import { getLocale } from 'next-intl/server';
import { cache } from 'react';

import { type Locale, resolveLocale } from './config';

export type DictionaryLoader = (locale: Locale) => Promise<{ default: Record<string, string> }>;

/** Load only this component's dictionary in the current request's language. */
export const getDictionary = cache(async (load: DictionaryLoader) => {
  const locale = resolveLocale(await getLocale());
  return { locale, messages: (await load(locale)).default };
});

export async function getText(load: DictionaryLoader) {
  const { locale, messages } = await getDictionary(load);
  return createTranslator({ locale, messages });
}
export type Text = Awaited<ReturnType<typeof getText>>;
