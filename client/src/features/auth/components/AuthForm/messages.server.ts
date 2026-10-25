import 'server-only';

import { getDictionary } from '@/shared/i18n/server';

import { loadMessages } from './messages';
export const dictionary = () => getDictionary(loadMessages);
