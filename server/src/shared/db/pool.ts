import { createPool as createMysqlPool, type Pool } from 'mysql2/promise';

import type { DbConfig } from '../../config.js';

export type { Pool };

/** Connections are opened lazily, so creating a pool does not require a running database. */
export const createPool = ({ host, port, user, password, database }: DbConfig): Pool =>
  createMysqlPool({
    host,
    port,
    user,
    password,
    database,
    connectionLimit: 10,
    // DATETIME has no time zone: treat it as UTC so dates serialize to the same ISO string everywhere.
    timezone: 'Z',
    // DECIMAL columns come back as numbers instead of strings.
    decimalNumbers: true,
  });
