import type { PoolConnection } from 'mysql2/promise';

import type { Pool } from './pool.js';

/** Runs `work` in a transaction: commits when it resolves, rolls back and rethrows when it fails. */
export const withTransaction = async <T>(
  pool: Pool,
  work: (connection: PoolConnection) => Promise<T>,
): Promise<T> => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await work(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};
