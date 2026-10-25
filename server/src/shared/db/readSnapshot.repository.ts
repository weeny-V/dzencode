import type { Pool, ReadDatabase } from './pool.js';

/** All consistent reads use one read-only InnoDB snapshot, even across module services. */
export const withReadSnapshot = async <T>(
  pool: Pool,
  work: (database: ReadDatabase) => Promise<T>,
): Promise<T> => {
  const connection = await pool.getConnection();
  try {
    await connection.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY');
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
