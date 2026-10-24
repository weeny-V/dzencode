'use client';

import { toQuery } from '@/shared/lib/searchParams';
import { LoadError } from '@/shared/ui/LoadError';
import { PageHeader } from '@/shared/ui/PageHeader';
import { ListSkeleton } from '@/shared/ui/Skeleton';

import { ProductForm } from '../ProductForm';
import { useNewProduct } from './useNewProduct';

interface NewProductContainerProps {
  /** The order the form was opened from (`?order=`); it is preselected when it exists. */
  orderId?: number;
}

/** The content of `/products/new`: waits for the lists the selects need, then shows the form. */
export function NewProductContainer({ orderId }: NewProductContainerProps) {
  const { types, orders, error, retry, create } = useNewProduct();

  if (error !== undefined) {
    return (
      <>
        <PageHeader title="Новый продукт" />
        <LoadError title="Не удалось загрузить данные формы." message={error} onRetry={retry} />
      </>
    );
  }
  if (!types || !orders) {
    return (
      <>
        <PageHeader title="Новый продукт" />
        <ListSkeleton rows={4} rowHeight="3.4rem" label="Загрузка формы…" />
      </>
    );
  }

  // A link with an order that does not exist (any more) just leaves the select empty.
  const initialOrder = orders.some((order) => order.id === orderId) ? orderId : undefined;

  return (
    <ProductForm
      types={types}
      orders={orders}
      initialOrder={initialOrder}
      cancelHref={`/orders${toQuery({ order: initialOrder === undefined ? undefined : String(initialOrder) })}`}
      onSubmit={create}
    />
  );
}
