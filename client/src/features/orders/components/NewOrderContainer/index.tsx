'use client';

import type { Warehouse } from '@/shared/api/types';

import { OrderForm } from '../OrderForm';
import { useNewOrder } from './useNewOrder';

/** The content of `/orders/new`: the form and what happens when it is sent. */
export function NewOrderContainer({ warehouses }: { warehouses: Warehouse[] }) {
  const createOrder = useNewOrder();

  return <OrderForm warehouses={warehouses} onSubmit={createOrder} />;
}
