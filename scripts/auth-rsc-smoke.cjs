// Production Next navigation regression with a local, controlled session-verification API; no DB writes.
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE ?? 'playwright');

let checks = 0;
const api = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  if (req.url !== '/auth/me') {
    res.writeHead(404).end('{}');
    return;
  }
  checks += 1;
  if (req.headers.authorization !== 'Bearer active-test-token') {
    res.writeHead(401).end(JSON.stringify({ error: 'Authentication required' }));
    return;
  }
  res.end(
    JSON.stringify({
      sessionId: 'a'.repeat(64),
      user: {
        id: 1,
        firstName: 'Navigation',
        lastName: 'Test',
        email: 'test@example.com',
        registeredAt: '2026-01-01T00:00:00Z',
      },
    }),
  );
});
let next;
let browser;
let output = '';
async function listen(server) {
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  return server.address().port;
}
async function main() {
  try {
    const apiPort = await listen(api);
    const reservation = http.createServer();
    const port = await listen(reservation);
    await new Promise((resolve) => reservation.close(resolve));
    const base = 'http://127.0.0.1:' + port;
    next = spawn(
      process.execPath,
      [require.resolve('next/dist/bin/next'), 'start', '-H', '127.0.0.1', '-p', String(port)],
      {
        cwd: path.resolve(__dirname, '../client'),
        env: {
          ...process.env,
          API_URL: 'http://127.0.0.1:' + apiPort,
          AUTH_COOKIE_SECURE: 'false',
        },
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );
    for (const stream of [next.stdout, next.stderr])
      stream.on('data', (data) => {
        output = (output + data.toString()).slice(-4000);
      });
    let ready = false;
    for (let attempt = 0; attempt < 200; attempt += 1) {
      if (next.exitCode !== null) throw new Error('Next exited: ' + output);
      try {
        const response = await fetch(base + '/health');
        if (response.ok) {
          ready = true;
          break;
        }
      } catch {
        /* Wait for the local production server. */
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    assert.ok(ready, 'Next did not start: ' + output);
    browser = await chromium.launch({
      channel: process.env.AUTH_SMOKE_BROWSER_CHANNEL ?? 'msedge',
      headless: true,
    });
    const context = await browser.newContext();
    await context.addCookies([
      {
        name: 'dzencode_auth',
        value: 'active-test-token',
        url: base,
        httpOnly: true,
        sameSite: 'Lax',
      },
    ]);
    const page = await context.newPage();
    await page.goto(base + '/groups');
    await page.getByRole('heading', { name: 'Groups', exact: true }).waitFor();
    const navigation = page.waitForRequest(
      (request) =>
        new URL(request.url()).pathname === '/settings' &&
        !!request.headers()['next-router-state-tree'],
    );
    await page.getByRole('link', { name: 'Settings', exact: true }).click();
    const captured = await navigation;
    await captured.response();
    await page.getByRole('heading', { name: 'Settings', exact: true }).waitFor();
    const fromSettings = page.waitForRequest(
      (request) =>
        new URL(request.url()).pathname === '/orders' &&
        !!request.headers()['next-router-state-tree'] &&
        !decodeURIComponent(request.headers()['next-router-state-tree']).includes('metadata-only'),
    );
    await page.getByRole('link', { name: 'Orders', exact: true }).click();
    const settingsTree = (await fromSettings).headers()['next-router-state-tree'];
    assert.ok(
      decodeURIComponent(settingsTree).includes('(protected)'),
      'Capture a full protected navigation tree, not a metadata-only request.',
    );
    await page.waitForURL((url) => url.pathname === '/orders');
    await context.addCookies([
      {
        name: 'dzencode_auth',
        value: 'invalid-test-token',
        url: base,
        httpOnly: true,
        sameSite: 'Lax',
      },
    ]);
    for (const route of ['/groups', '/settings', '/orders/new']) {
      const before = checks;
      const response = await context.request.get(base + route, {
        headers: {
          RSC: '1',
          Cookie: 'dzencode_auth=invalid-test-token',
          'Next-Router-State-Tree': settingsTree,
        },
        maxRedirects: 5,
      });
      const body = await response.text();
      assert.ok(checks > before, 'No session verification for partial navigation: ' + route);
      const redirect = response.headers().location ?? body;
      assert.ok(
        redirect.includes('/login?returnTo=' + encodeURIComponent(route)),
        'No login redirect for partial navigation: ' + route,
      );
    }
    console.info(
      'Protected RSC navigation passed: Groups, Settings and new-order content verify rejected sessions with a reused router tree.',
    );
  } finally {
    await browser?.close();
    if (next && next.exitCode === null) {
      const exited = once(next, 'exit');
      next.kill();
      await exited;
    }
    api.closeAllConnections();
    await new Promise((resolve) => api.close(resolve));
  }
}
async function run() {
  try {
    await main();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
void run();
