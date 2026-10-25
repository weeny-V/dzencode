import type { createOrdersInventoryRepository } from './orders.inventory.repository.js';

export const createOrdersInventoryService = ({
  repository,
}: {
  repository: ReturnType<typeof createOrdersInventoryRepository>;
}) => ({
  inventoryLocations: () => repository.inventoryLocations(),
});
export type OrdersInventoryService = ReturnType<typeof createOrdersInventoryService>;
