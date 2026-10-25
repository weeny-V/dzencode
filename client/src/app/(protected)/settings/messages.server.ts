import { getDictionary, getText } from '@/shared/i18n/server';

import { loadMessages } from './messages';
export const dictionary = () => getDictionary(loadMessages);
export const text = () => getText(loadMessages);
