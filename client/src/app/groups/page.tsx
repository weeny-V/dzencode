import type { Metadata } from 'next';

import { ComingSoon } from '@/shared/ui/ComingSoon';
import { PageTransition } from '@/shared/ui/PageTransition';

export const metadata: Metadata = { title: 'Группы' };

export default function GroupsPage() {
  return (
    <PageTransition>
      <ComingSoon title="Группы" />
    </PageTransition>
  );
}
