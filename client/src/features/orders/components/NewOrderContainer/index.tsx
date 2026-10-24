'use client';

import { OrderForm } from '../OrderForm';
import { useNewOrder } from './useNewOrder';

/** The content of `/orders/new`: the form and what happens when it is sent. */
export function NewOrderContainer() {
  const createOrder = useNewOrder();

  return <OrderForm onSubmit={createOrder} />;
}
