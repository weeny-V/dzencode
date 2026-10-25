import { getDictionary } from '@/shared/i18n/server';

import { type ExportProductsMessages, loadMessages } from './messages';

export const dictionary = async () => {
  const { locale, messages } = await getDictionary(loadMessages);
  return { locale, messages: messages as ExportProductsMessages };
};
