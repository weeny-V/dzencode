import { ButtonLink } from '@/shared/ui/Button';
import { NoticePage } from '@/shared/ui/NoticePage';

import { text } from './not-found/messages.server';

export default async function NotFound() {
  const t = await text();
  return (
    <NoticePage title={t('title')} text={t('text')}>
      <ButtonLink href="/orders">{t('back')}</ButtonLink>
    </NoticePage>
  );
}
