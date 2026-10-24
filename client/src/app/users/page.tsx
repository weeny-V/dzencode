import type { Metadata } from 'next';

import { ComingSoon } from '@/shared/ui/ComingSoon';
import { PageTransition } from '@/shared/ui/PageTransition';

export const metadata: Metadata = { title: 'Пользователи' };

export default function UsersPage() {
  return (
    <PageTransition>
      <ComingSoon title="Пользователи" />
    </PageTransition>
  );
}
