import type { RowDataPacket } from 'mysql2/promise';

import type { ReadDatabase } from '../../shared/db/pool.js';
import type { Warehouse } from './warehouses.types.js';

interface WarehouseRow extends RowDataPacket, Warehouse {}

export const createWarehousesRepository = (pool: ReadDatabase) => ({
  async list(): Promise<Warehouse[]> {
    const [rows] = await pool.query<WarehouseRow[]>(
      'SELECT id, code, name, address, latitude, longitude FROM warehouses ORDER BY code',
    );
    return rows;
  },
});

export type WarehousesRepository = ReturnType<typeof createWarehousesRepository>;
