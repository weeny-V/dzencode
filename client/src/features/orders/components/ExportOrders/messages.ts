import type { Locale } from '@/shared/i18n/config';
/** Import only the selected language, without reading request state. */
export const loadMessages = (locale: Locale): Promise<{ default: ExportOrdersMessages }> =>
  import(`./messages/${locale}.json`);

import type shape from './messages/en.json';
export type ExportOrdersMessages = typeof shape;
