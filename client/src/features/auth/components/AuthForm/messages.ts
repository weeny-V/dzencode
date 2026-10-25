import type { Locale } from '@/shared/i18n/config';

export const loadMessages = (locale: Locale) =>
  locale === 'ru' ? import('./messages/ru.json') : import('./messages/en.json');
