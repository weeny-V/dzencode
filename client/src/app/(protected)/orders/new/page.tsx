import { Suspense } from 'react';

import { NewOrderContent, NewOrderLoading } from '@/features/orders';
import { pageMetadata } from '@/shared/i18n/metadata';
import { PageTransition } from '@/shared/ui/PageTransition';

import { text } from './messages.server';

export const generateMetadata = () => pageMetadata(text);

export default function Page() {
  return (
    <PageTransition>
      <Suspense fallback={<NewOrderLoading />}>
        <NewOrderContent />
      </Suspense>
    </PageTransition>
  );
}
