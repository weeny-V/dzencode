import type { Metadata } from 'next';

import { NewOrderContainer } from '@/features/orders';
import { PageTransition } from '@/shared/ui/PageTransition';

export const metadata: Metadata = { title: 'Новый приход' };

export default function Page() {
  return (
    <PageTransition>
      <NewOrderContainer />
    </PageTransition>
  );
}
