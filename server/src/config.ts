export interface DbConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

export interface Config {
  host: string;
  port: number;
  clientOrigin: string;
  db: DbConfig;
}

export const loadConfig = (env: NodeJS.ProcessEnv = process.env): Config => ({
  host: env.HOST ?? '0.0.0.0',
  port: Number(env.PORT ?? 4000),
  clientOrigin: env.CLIENT_ORIGIN ?? 'http://localhost:3000',
  db: {
    host: env.DB_HOST ?? 'localhost',
    port: Number(env.DB_PORT ?? 3306),
    user: env.DB_USER ?? 'dzencode',
    password: env.DB_PASSWORD ?? 'dzencode',
    database: env.DB_NAME ?? 'dzencode',
  },
});
