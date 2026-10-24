import type { RowDataPacket } from 'mysql2/promise';

import type { Pool } from '../../shared/db/pool.js';
import type { ProductType } from './productTypes.types.js';

interface ProductTypeRow extends RowDataPacket, ProductType {}

export const createProductTypesRepository = (pool: Pool) => ({
  async list(): Promise<ProductType[]> {
    const [rows] = await pool.query<ProductTypeRow[]>(
      'SELECT id, name FROM product_types ORDER BY name',
    );
    return rows.map(({ id, name }) => ({ id, name }));
  },

  async findIdByName(name: string): Promise<number | undefined> {
    const [rows] = await pool.query<ProductTypeRow[]>(
      'SELECT id, name FROM product_types WHERE name = ?',
      [name],
    );
    return rows[0]?.id;
  },
});

export type ProductTypesRepository = ReturnType<typeof createProductTypesRepository>;
