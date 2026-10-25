// Local-only production smoke for stage 7b: inventory events reach other open tabs without a reload.
// It targets an isolated loopback stack and requires STAGE7B_SMOKE_ALLOW_WRITES=1 (it creates demo accounts/orders).
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium, request } = require(process.env.PLAYWRIGHT_PACKAGE ?? 'playwright');

const base = process.env.STAGE7B_SMOKE_BASE_URL ?? 'http://localhost:3064';
const api = process.env.STAGE7B_SMOKE_API_URL ?? 'http://localhost:4064';
const artifacts = process.env.STAGE7B_SMOKE_ARTIFACTS ?? path.resolve('test-results/stage7b');
assert.equal(
  process.env.STAGE7B_SMOKE_ALLOW_WRITES,
  '1',
  'Explicit isolated test-data authorization required.',
);
for (const url of [base, api])
  assert.ok(['localhost', '127.0.0.1'].includes(new URL(url).hostname));

const password = 'stage 7b browser test password';
const run = String(Date.now());
const account = {
  firstName: 'Stage7b',
  lastName: 'Events',
  email: `stage7b-${run}@example.com`,
  password,
  passwordConfirmation: password,
};
const SYNC_TIMEOUT = 5000;
const createdOrders = [];
const tabs = [];
const errors = [];
let browser;
let apiClient;
let token;
let phase = 'startup';

async function json(method, route, data) {
  const response = await apiClient[method](api + route, {
    data,
    headers: token ? { Authorization: 'Bearer ' + token } : {},
  });
  assert.ok(response.ok(), `${method} ${route} returned ${response.status()}`);
  return response.status() === 204 ? undefined : response.json();
}
const createOrder = async (title) => {
  const order = await json('post', '/orders', { title });
  createdOrders.push(order.id);
  return order;
};
const createProduct = (order, index) =>
  json('post', '/products', {
    title: `Stage7b product ${run} ${index}`,
    serialNumber: Number(run.slice(-8)) + index,
    isNew: true,
    type: 'Monitors',
    order,
    guarantee: { start: '2026-01-01', end: '2027-01-01' },
    price: [{ value: 10, symbol: 'UAH', isDefault: true }],
  });

async function openTab(name) {
  const context = await browser.newContext({
    viewport: { width: 1365, height: 900 },
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  const socket = { blocked: false, open: [] };
  // Playwright's offline mode does not close an established WebSocket: the connection is routed to be cut on demand.
  await page.routeWebSocket('**/socket.io/**', (ws) => {
    if (socket.blocked) {
      void ws.close();
      return;
    }
    ws.connectToServer();
    socket.open.push(ws);
  });
  tabs.push({ name, page });
  page.on('pageerror', (error) => errors.push(`${name}: ${error.message}`));
  page.on('console', (event) => {
    if (event.type() === 'error' && /MISSING_MESSAGE|hydration|Hydration/.test(event.text()))
      errors.push(`${name}: ${event.text()}`);
  });
  await page.goto(base + '/login?returnTo=' + encodeURIComponent('/orders'));
  await page.getByRole('button', { name: 'EN', exact: true }).click();
  await page.getByLabel('Email', { exact: false }).fill(account.email);
  await page.getByLabel('Password', { exact: false }).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  // Sign-in starts a hard navigation and the tab's own auth-change reload: poll instead of waiting on one.
  const deadline = Date.now() + 30000;
  while (new URL(page.url()).pathname !== '/orders') {
    assert.ok(Date.now() < deadline, 'Timed out signing in ' + name);
    await page.waitForTimeout(100);
  }
  await page.waitForLoadState('load');
  return {
    context,
    page,
    cutSocket: async () => {
      socket.blocked = true;
      for (const ws of socket.open.splice(0)) await ws.close();
    },
    restoreSocket: () => {
      socket.blocked = false;
    },
  };
}
const counter = (page) => page.locator('.sessions-counter__value');

async function main() {
  await fs.mkdir(artifacts, { recursive: true });
  apiClient = await request.newContext();
  token = (await json('post', '/auth/register', account)).token;
  browser = await chromium.launch({
    channel: process.env.AUTH_SMOKE_BROWSER_CHANNEL ?? 'msedge',
    headless: true,
  });

  phase = 'two tabs and the counter on the bus';
  const a = await openTab('tab A');
  const b = await openTab('tab B');
  await counter(a.page).filter({ hasText: '2' }).waitFor({ timeout: SYNC_TIMEOUT });
  await counter(b.page).filter({ hasText: '2' }).waitFor({ timeout: SYNC_TIMEOUT });

  phase = 'a direct API write appears in another tab without a reload';
  const created = await createOrder(`Live ${run} one`);
  await b.page
    .getByText(`Live ${run} one`, { exact: false })
    .first()
    .waitFor({ timeout: SYNC_TIMEOUT });
  await a.page
    .getByText(`Live ${run} one`, { exact: false })
    .first()
    .waitFor({ timeout: SYNC_TIMEOUT });

  phase = 'products count follows a product written elsewhere';
  await createProduct(created.id, 1);
  await b.page
    .locator('.order-item', { hasText: `Live ${run} one` })
    .locator('.order-item__count-number')
    .filter({ hasText: /^1$/ })
    .waitFor({ timeout: SYNC_TIMEOUT });

  phase = 'the groups report follows the inventory';
  await b.page.goto(base + '/groups');
  await b.page.getByRole('table', { name: 'Product count by type', exact: true }).waitFor();
  const countOf = async () =>
    Number(
      (await b.page.locator('.groups-content__cards dd').nth(1).textContent()).replaceAll(',', ''),
    );
  const before = await countOf();
  await createProduct(created.id, 2);
  const deadline = Date.now() + SYNC_TIMEOUT;
  while ((await countOf()) !== before + 1) {
    assert.ok(Date.now() < deadline, 'Groups did not follow the new product');
    await b.page.waitForTimeout(150);
  }

  phase = 'an open order panel closes with a notice when its order is deleted elsewhere';
  const doomed = await createOrder(`Doomed ${run}`);
  await b.page.goto(base + `/orders?order=${doomed.id}&q=${encodeURIComponent('Doomed ' + run)}`);
  await b.page.locator('.order-panel__title', { hasText: `Doomed ${run}` }).waitFor();
  // Events sent before the page's socket is connected are not replayed (the server keeps no queue).
  await counter(b.page).filter({ hasText: /\d/ }).waitFor({ timeout: SYNC_TIMEOUT });
  await json('delete', `/orders/${doomed.id}`);
  await b.page
    .getByText('This order was deleted in another tab.', { exact: true })
    .waitFor({ timeout: SYNC_TIMEOUT });
  // The router applies the replacement a moment after the notice appears.
  await b.page.waitForURL((url) => !url.searchParams.has('order'), { timeout: SYNC_TIMEOUT });
  const url = new URL(b.page.url());
  await b.page.locator('.order-panel').waitFor({ state: 'detached', timeout: SYNC_TIMEOUT });
  assert.equal(url.searchParams.get('q'), `Doomed ${run}`, 'Other search params are kept');
  await b.page.screenshot({ path: path.join(artifacts, 'notice.png') });
  await b.page.getByRole('button', { name: 'Dismiss', exact: true }).click();
  await b.page.getByText('This order was deleted in another tab.').waitFor({ state: 'detached' });

  phase = 'deleting an order in this tab shows no false notice';
  // A row can only be deleted while no panel is open (the narrow list hides the button).
  await createOrder(`Own ${run}`);
  // Tab A hears the event and refreshes itself, so the new row is there without a reload.
  const row = a.page.locator('.order-item', { hasText: `Own ${run}` });
  await row.first().waitFor({ timeout: SYNC_TIMEOUT });
  await row.getByRole('button', { name: `Delete order Own ${run}`, exact: true }).click();
  await a.page.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true }).click();
  await row.first().waitFor({ state: 'detached', timeout: SYNC_TIMEOUT });
  await a.page.waitForTimeout(1200);
  assert.equal(await a.page.getByText('This order was deleted in another tab.').count(), 0);

  phase = 'a tab that was offline catches up after reconnecting';
  await b.page.goto(base + '/orders');
  await counter(b.page).filter({ hasText: /\d/ }).waitFor();
  await b.cutSocket();
  await counter(b.page).filter({ hasText: '—' }).waitFor({ timeout: 15000 });
  const missed = await createOrder(`Missed ${run}`);
  assert.ok(missed.id);
  b.restoreSocket();
  await b.page.getByText(`Missed ${run}`, { exact: false }).first().waitFor({ timeout: 30000 });

  phase = 'closing a tab lowers the counter';
  await a.context.close();
  await counter(b.page).filter({ hasText: '1' }).waitFor({ timeout: SYNC_TIMEOUT });

  assert.deepEqual(errors, []);
  console.info(
    'Stage 7b events smoke passed: counter on the bus, live orders/products/groups across tabs, deleted-panel notice, no false own notice, reconnect resync.',
  );
}

async function runSmoke() {
  try {
    await main();
  } catch (error) {
    for (const { name, page } of tabs)
      await page
        .screenshot({
          path: path.join(artifacts, `failure-${name.replace(' ', '-')}.png`),
          fullPage: true,
        })
        .catch(() => undefined);
    console.error('Stage 7b smoke failed during ' + phase, error);
    process.exitCode = 1;
  } finally {
    await browser?.close();
    if (apiClient && token)
      for (const id of createdOrders)
        await apiClient.delete(api + '/orders/' + id, {
          headers: { Authorization: 'Bearer ' + token },
        });
    await apiClient?.dispose();
  }
}
void runSmoke();
