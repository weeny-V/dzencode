import { pageMetadata } from '@/shared/i18n/metadata';
import { ComingSoon } from '@/shared/ui/ComingSoon';
import { PageTransition } from '@/shared/ui/PageTransition';

import { text } from './messages.server';

export const generateMetadata = () => pageMetadata(text);

export default async function UsersPage() {
  const t = await text();
  return (
    <PageTransition>
      <ComingSoon title={t('title')} />
    </PageTransition>
  );
}
