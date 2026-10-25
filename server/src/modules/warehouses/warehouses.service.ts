import type { WarehousesRepository } from './warehouses.repository.js';

export const createWarehousesService = ({ repository }: { repository: WarehousesRepository }) => ({
  list: () => repository.list(),
});

export type WarehousesService = ReturnType<typeof createWarehousesService>;
