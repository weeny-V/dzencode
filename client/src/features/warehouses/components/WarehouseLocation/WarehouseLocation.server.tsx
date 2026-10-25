import type { Warehouse } from '@/shared/api/types';

import { WarehouseLocation as WarehouseLocationClient } from '.';
import { dictionary } from './messages.server';

export async function WarehouseLocation({
  warehouse,
  orderId,
}: {
  warehouse: Warehouse | null;
  orderId: number;
}) {
  const { messages } = await dictionary();
  return <WarehouseLocationClient key={orderId} warehouse={warehouse} messages={messages} />;
}
