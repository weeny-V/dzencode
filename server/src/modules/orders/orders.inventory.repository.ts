import type { RowDataPacket } from 'mysql2/promise';

import type { ReadDatabase } from '../../shared/db/pool.js';

export const createOrdersInventoryRepository = (database: ReadDatabase) => ({
  async inventoryLocations(): Promise<{ id: number; title: string; warehouseId: number | null }[]> {
    const [rows] = await database.query<
      (RowDataPacket & { id: number; title: string; warehouseId: number | null })[]
    >('SELECT id, title, warehouse_id AS warehouseId FROM orders ORDER BY id');
    return rows;
  },
});
