import type { Locale } from '@/shared/i18n/config';
import { loadMessages as confirm } from '@/shared/ui/ConfirmDialog/messages';
import { loadMessages as modal } from '@/shared/ui/Modal/messages';

import { loadMessages as host } from './components/DeleteDialogHost/messages';
export async function confirmationMessages(locale: Locale) {
  const [h, c, m] = await Promise.all([host(locale), confirm(locale), modal(locale)]);
  return { DeleteDialogHost: h.default, ConfirmDialog: c.default, Modal: m.default };
}
