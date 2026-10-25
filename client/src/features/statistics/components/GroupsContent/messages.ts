import type { Locale } from '@/shared/i18n/config';

import type messageShape from './messages/en.json';

export type GroupsMessages = typeof messageShape;
export const loadMessages = (locale: Locale): Promise<{ default: GroupsMessages }> =>
  import(`./messages/${locale}.json`);
