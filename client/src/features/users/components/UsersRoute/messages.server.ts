import 'server-only';

import { getText } from '@/shared/i18n/server';

import { loadMessages } from './messages';
export const text = () => getText(loadMessages);
