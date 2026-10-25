import { Suspense } from 'react';

import { ProtectedPage } from '@/features/auth';
import { GroupsContent, GroupsHeader, GroupsLoading } from '@/features/statistics';
import { pageMetadata } from '@/shared/i18n/metadata';
import type { SearchParams } from '@/shared/lib/searchParams';
import { PageTransition } from '@/shared/ui/PageTransition';

import { text } from './messages.server';

export const generateMetadata = () => pageMetadata(text);

export default function GroupsPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <ProtectedPage>
      <PageTransition>
        <GroupsHeader />
        <Suspense fallback={<GroupsLoading />}>
          <GroupsContent searchParams={searchParams} />
        </Suspense>
      </PageTransition>
    </ProtectedPage>
  );
}
