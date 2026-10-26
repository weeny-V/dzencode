import { readFileSync } from 'node:fs';

export interface DbConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  tls?: { ca: string };
}

export interface Config {
  host: string;
  port: number;
  clientOrigin: string;
  jwtSecret: string;
  db: DbConfig;
}

const databaseTls = (env: NodeJS.ProcessEnv): DbConfig['tls'] => {
  if (env.DB_SSL === undefined || env.DB_SSL === 'false') return undefined;
  if (env.DB_SSL !== 'true') throw new Error('DB_SSL must be true or false');
  if (env.DB_SSL_CA) return { ca: env.DB_SSL_CA.replaceAll('\\n', '\n') };
  if (!env.DB_SSL_CA_FILE)
    throw new Error('DB_SSL_CA or DB_SSL_CA_FILE is required when DB_SSL is true');
  return { ca: readFileSync(env.DB_SSL_CA_FILE, 'utf8') };
};

export const loadConfig = (env: NodeJS.ProcessEnv = process.env): Config => ({
  host: env.HOST ?? '0.0.0.0',
  port: Number(env.PORT ?? 4000),
  clientOrigin: env.CLIENT_ORIGIN ?? 'http://localhost:3000',
  jwtSecret: env.AUTH_JWT_SECRET ?? '',
  db: {
    host: env.DB_HOST ?? 'localhost',
    port: Number(env.DB_PORT ?? 3306),
    user: env.DB_USER ?? 'dzencode',
    password: env.DB_PASSWORD ?? 'dzencode',
    database: env.DB_NAME ?? 'dzencode',
    ...(env.DB_SSL === undefined ? {} : { tls: databaseTls(env) }),
  },
});
