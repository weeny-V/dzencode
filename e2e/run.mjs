import { spawn, spawnSync } from 'node:child_process';
import { mkdir, open, unlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { verifyStack } from './stack.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const project = `dzencode-tests-${process.pid}`;
const mode = process.argv[2];
const extraArgs = process.argv.slice(3);
const lockPath = path.join(root, 'test-results', 'stack.lock');
let child;
let interrupted = false;

function interrupt() {
  if (interrupted) return;
  interrupted = true;
  if (!child?.pid) return;
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
  } else process.kill(-child.pid, 'SIGTERM');
}

async function run(command, args, env = {}) {
  const cleaning =
    command === 'docker' && ['down', 'logs'].includes(args[args.indexOf('--file') + 2]);
  if (interrupted && !cleaning) throw new Error('Verification interrupted.');
  let executable = command;
  if (command === 'npm') {
    if (!process.env.npm_execpath) throw new Error('Start verification through npm run.');
    executable = process.execPath;
    args = [process.env.npm_execpath, ...args];
  }
  if (command === 'playwright') {
    executable = process.execPath;
    args = [path.join(root, 'node_modules/@playwright/test/cli.js'), ...args, ...extraArgs];
  }
  await new Promise((resolve, reject) => {
    child = spawn(executable, args, {
      cwd: root,
      env: { ...process.env, ...env },
      stdio: 'inherit',
      windowsHide: true,
      // A POSIX process group lets interruption stop npm and its test subprocesses together.
      detached: process.platform !== 'win32',
    });
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      child = undefined;
      if (code === 0) resolve();
      else reject(new Error(`${command} failed (${signal ?? code}).`));
    });
  });
}

async function main() {
  if (!['integration', 'e2e', 'system'].includes(mode))
    throw new Error('Use integration, e2e or system.');
  await mkdir(path.dirname(lockPath), { recursive: true });
  let lock;
  try {
    lock = await open(lockPath, 'wx');
  } catch {
    throw new Error(
      'Another verification owns test-results/stack.lock. If it crashed, remove its Docker project and this lock before retrying.',
    );
  }
  try {
    await lock.writeFile(JSON.stringify({ pid: process.pid, project }));
    process.on('SIGINT', interrupt);
    process.on('SIGTERM', interrupt);
    await verifyStack(mode, run, project, root);
  } finally {
    process.off('SIGINT', interrupt);
    process.off('SIGTERM', interrupt);
    await lock.close();
    await unlink(lockPath);
  }
}

try {
  await main();
} catch (error) {
  console.error(error);
  process.exitCode = interrupted ? 130 : 1;
}
