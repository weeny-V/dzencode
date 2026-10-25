import { UsersRoute } from '@/features/users';
import { pageMetadata } from '@/shared/i18n/metadata';
import { PageTransition } from '@/shared/ui/PageTransition';

import { text } from './messages.server';

export const generateMetadata = () => pageMetadata(text);

export default function UsersPage() {
  return (
    <PageTransition>
      <UsersRoute />
    </PageTransition>
  );
}
