export interface Config {
  host: string;
  port: number;
  clientOrigin: string;
}

export const loadConfig = (env: NodeJS.ProcessEnv = process.env): Config => ({
  host: env.HOST ?? '0.0.0.0',
  port: Number(env.PORT ?? 4000),
  clientOrigin: env.CLIENT_ORIGIN ?? 'http://localhost:3000',
});
