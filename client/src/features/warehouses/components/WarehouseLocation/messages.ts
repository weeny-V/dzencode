import type { Locale } from '@/shared/i18n/config';

import type messageShape from './messages/en.json';

export type WarehouseMessages = typeof messageShape;
export const loadMessages = (locale: Locale): Promise<{ default: WarehouseMessages }> =>
  import(`./messages/${locale}.json`);
