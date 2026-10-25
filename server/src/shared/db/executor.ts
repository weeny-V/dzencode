import type { Pool, PoolConnection } from 'mysql2/promise';

/** Shared transaction context; each repository still owns SQL for its own tables. */
export type DbExecutor = Pool | PoolConnection;
export type Transaction = <T>(work: (executor: DbExecutor) => Promise<T>) => Promise<T>;
