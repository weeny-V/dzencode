import type { Locale } from '@/shared/i18n/config';
/** Import only the selected language, without reading request state. */
export const loadMessages = (locale: Locale): Promise<{ default: Record<string, string> }> =>
  import(`./messages/${locale}.json`);
