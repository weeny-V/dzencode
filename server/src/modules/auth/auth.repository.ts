import type { RowDataPacket } from 'mysql2/promise';

import type { DbExecutor } from '../../shared/db/executor.js';
import type { Pool } from '../../shared/db/pool.js';

export const createAuthRepository = (pool: Pool) => ({
  async create(sessionId: string, userId: number, executor: DbExecutor = pool): Promise<void> {
    await executor.query(
      'INSERT INTO auth_sessions (id, user_id, created_at) VALUES (?, ?, UTC_TIMESTAMP())',
      [sessionId, userId],
    );
  },
  async isActive(sessionId: string, userId: number): Promise<boolean> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM auth_sessions WHERE id = ? AND user_id = ? AND revoked_at IS NULL',
      [sessionId, userId],
    );
    return rows.length === 1;
  },
  async revoke(sessionId: string, userId: number): Promise<void> {
    await pool.query(
      'UPDATE auth_sessions SET revoked_at = UTC_TIMESTAMP() WHERE id = ? AND user_id = ? AND revoked_at IS NULL',
      [sessionId, userId],
    );
  },
});

export type AuthRepository = ReturnType<typeof createAuthRepository>;
