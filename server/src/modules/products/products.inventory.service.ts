import type { createProductsInventoryRepository } from './products.inventory.repository.js';
import type { InventoryCurrency } from './products.types.js';

export const createProductsInventoryService = ({
  repository,
}: {
  repository: ReturnType<typeof createProductsInventoryRepository>;
}) => ({
  inventoryGroups: (currency: InventoryCurrency) => repository.inventoryGroups(currency),
});
export type ProductsInventoryService = ReturnType<typeof createProductsInventoryService>;
