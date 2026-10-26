import { spawn } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';

import { deploymentConfig } from './config.mjs';

const { port, origin } = deploymentConfig(process.env);
const template = await readFile(new URL('./nginx.conf', import.meta.url), 'utf8');
await writeFile('/tmp/inventory-nginx.conf', template.replace('__PORT__', String(port)));
const children = new Set();
let stopping = false;
let failed = false;
let timer;

function stop(code) {
  if (stopping) return;
  stopping = true;
  process.exitCode = code;
  for (const child of children) child.kill('SIGTERM');
  timer = setTimeout(() => {
    for (const child of children) child.kill('SIGKILL');
  }, 8000);
  timer.unref();
}

function start(name, command, args, env = {}) {
  const child = spawn(command, args, { stdio: 'inherit', env: { ...process.env, ...env } });
  children.add(child);
  child.once('error', () => {
    console.error(`Could not start ${name}`);
    failed = true;
    stop(1);
  });
  child.once('exit', (code) => {
    children.delete(child);
    if (!stopping) {
      console.error(`${name} exited (${code})`);
      failed = true;
      stop(1);
    }
    if (children.size === 0) clearTimeout(timer);
  });
}

process.on('SIGTERM', () => stop(0));
process.on('SIGINT', () => stop(0));
start('API', process.execPath, ['api/server/dist/index.js'], {
  HOST: '127.0.0.1',
  PORT: '4000',
  CLIENT_ORIGIN: origin,
});
start('Next', process.execPath, ['web/client/server.js'], {
  HOSTNAME: '127.0.0.1',
  PORT: '3000',
  API_URL: 'http://127.0.0.1:4000',
});

// Expose the proxy only after both listeners respond. Failed children stop the entire container.
let ready = false;
for (let attempt = 0; attempt < 60 && !stopping; attempt += 1) {
  try {
    const responses = await Promise.all(
      [3000, 4000].map((value) =>
        fetch(`http://127.0.0.1:${value}/health`, { signal: AbortSignal.timeout(1000) }),
      ),
    );
    if (responses.every((response) => response.ok)) {
      ready = true;
      break;
    }
  } catch {
    /* Listener startup can briefly refuse connections. */
  }
  await delay(500);
}
if (ready && !stopping) {
  start('proxy', 'nginx', ['-e', 'stderr', '-c', '/tmp/inventory-nginx.conf', '-g', 'daemon off;']);
  console.info(`Public listener configured for 0.0.0.0:${port}`);
} else if (!stopping) stop(1);
if (failed) process.exitCode = 1;
