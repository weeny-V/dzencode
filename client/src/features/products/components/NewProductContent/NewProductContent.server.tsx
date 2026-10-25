import { loadOrError } from '@/shared/api/server';
import type { ActionResult } from '@/shared/lib/actionResult';
import { LoadError } from '@/shared/ui/LoadError';
import { PageHeader } from '@/shared/ui/PageHeader';

import { getOrderOptions, getProductTypes, type OrderOption } from '../../api/products';
import { NewProductContainer } from '../NewProductContainer';

export async function NewProductContent({ orderId }: { orderId?: number }) {
  const result = await loadOrError(() => Promise.all([getProductTypes(), getOrderOptions()]));
  return <NewProductContentView result={result} orderId={orderId} />;
}

function NewProductContentView({
  result,
  orderId,
}: {
  result: ActionResult<[string[], OrderOption[]]>;
  orderId?: number;
}) {
  if (!result.ok)
    return (
      <>
        <PageHeader title="Новый продукт" />
        <LoadError title="Не удалось загрузить данные формы." message={result.error} />
      </>
    );
  const [types, orders] = result.data;
  return <NewProductContainer types={types} orders={orders} orderId={orderId} />;
}
