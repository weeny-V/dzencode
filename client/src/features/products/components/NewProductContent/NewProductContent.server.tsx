import { loadOrError } from '@/shared/api/server';
import { FormMessages } from '@/shared/i18n/FormMessages.server';
import type { Text } from '@/shared/i18n/server';
import type { ActionResult } from '@/shared/lib/actionResult';
import { LoadError } from '@/shared/ui/LoadError';
import { PageHeader } from '@/shared/ui/PageHeader';

import { getOrderOptions, getProductTypes, type OrderOption } from '../../api/products';
import { NewProductContainer } from '../NewProductContainer';
import { dictionary, text } from '../ProductForm/messages.server';

export async function NewProductContent({ orderId }: { orderId?: number }) {
  const result = await loadOrError(() => Promise.all([getProductTypes(), getOrderOptions()]));
  return (
    <FormMessages name="ProductForm" dictionary={await dictionary()}>
      <NewProductContentView t={await text()} result={result} orderId={orderId} />
    </FormMessages>
  );
}

function NewProductContentView({
  t,
  result,
  orderId,
}: {
  t: Text;
  result: ActionResult<[string[], OrderOption[]]>;
  orderId?: number;
}) {
  if (!result.ok)
    return (
      <>
        <PageHeader title={t('title')} />
        <LoadError title={t('failed')} />
      </>
    );
  const [types, orders] = result.data;
  return (
    <NewProductContainer key={orderId ?? 'none'} types={types} orders={orders} orderId={orderId} />
  );
}
