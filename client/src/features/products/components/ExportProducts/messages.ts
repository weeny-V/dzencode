import type { Locale } from '@/shared/i18n/config';

import type shape from './messages/en.json';

export type ExportProductsMessages = typeof shape;
/** Import only the selected language, without reading request state. */
export const loadMessages = (locale: Locale): Promise<{ default: ExportProductsMessages }> =>
  import(`./messages/${locale}.json`);
