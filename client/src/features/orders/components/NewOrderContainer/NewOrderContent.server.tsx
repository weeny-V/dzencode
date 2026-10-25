import { getWarehouses } from '@/features/warehouses';
import { loadOrError } from '@/shared/api/server';
import { requireSession } from '@/shared/api/session.server';
import { FormMessages } from '@/shared/i18n/FormMessages.server';
import { LoadError } from '@/shared/ui/LoadError';
import { PageHeader } from '@/shared/ui/PageHeader';
import { ListSkeleton } from '@/shared/ui/Skeleton';

import { dictionary, text } from '../OrderForm/messages.server';
import { NewOrderContainer } from '.';
export async function NewOrderContent() {
  await requireSession();
  const [result, messages, t] = await Promise.all([
    loadOrError(() => getWarehouses()),
    dictionary(),
    text(),
  ]);
  if (!result.ok)
    return (
      <>
        <PageHeader title={t('title')} />
        <LoadError title={t('failed')} />
      </>
    );
  return (
    <FormMessages name="OrderForm" dictionary={messages}>
      <NewOrderContainer warehouses={result.data} />
    </FormMessages>
  );
}

export async function NewOrderLoading() {
  const t = await text();
  return <ListSkeleton rows={3} rowHeight="3rem" label={t('loading')} />;
}
