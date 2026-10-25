'use client';

import { toQuery } from '@/shared/lib/searchParams';

import type { OrderOption } from '../../api/products';
import { ProductForm } from '../ProductForm';
import { useNewProduct } from './useNewProduct';

interface NewProductContainerProps {
  /** The order the form was opened from (`?order=`); it is preselected when it exists. */
  orderId?: number;
  types: readonly string[];
  orders: readonly OrderOption[];
}

/** Receives complete select options from the server and connects the form to its submission hook. */
export function NewProductContainer({ orderId, types, orders }: NewProductContainerProps) {
  const create = useNewProduct();

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
