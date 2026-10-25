// Local-only production smoke for stage 7c: CSV export through a Web Worker and the PWA (manifest, service worker,
// offline page, what is and is not cached). Targets an isolated loopback stack and requires
// STAGE7C_SMOKE_ALLOW_WRITES=1 (it creates a demo account and a few orders and products, and removes them).
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium, request } = require(process.env.PLAYWRIGHT_PACKAGE ?? 'playwright');

const base = process.env.STAGE7C_SMOKE_BASE_URL ?? 'http://localhost:3064';
const api = process.env.STAGE7C_SMOKE_API_URL ?? 'http://localhost:4064';
const artifacts = process.env.STAGE7C_SMOKE_ARTIFACTS ?? path.resolve('test-results/stage7c');
assert.equal(
  process.env.STAGE7C_SMOKE_ALLOW_WRITES,
  '1',
  'Explicit isolated test-data authorization required.',
);
for (const url of [base, api])
  assert.ok(['localhost', '127.0.0.1'].includes(new URL(url).hostname));

const password = 'stage 7c browser test password';
const run = String(Date.now());
const account = {
  firstName: 'Stage7c',
  lastName: 'Smoke',
  email: `stage7c-${run}@example.com`,
  password,
  passwordConfirmation: password,
};
const errors = [];
const diagnostics = [];
const createdOrders = [];
let apiClient;
let token;
let browser;
let page;
let phase = 'startup';

async function json(method, route, data) {
  const response = await apiClient[method](api + route, {
    data,
    headers: token ? { Authorization: 'Bearer ' + token } : {},
  });
  assert.ok(response.ok(), `${method} ${route} returned ${response.status()}`);
  return response.status() === 204 ? undefined : response.json();
}
const parseCsv = (text) => {
  assert.equal(text.charCodeAt(0), 0xfeff, 'The file starts with a byte order mark');
  return text
    .slice(1)
    .split('\r\n')
    .filter((line) => line !== '');
};

async function main() {
  await fs.mkdir(artifacts, { recursive: true });
  apiClient = await request.newContext();
  token = (await json('post', '/auth/register', account)).token;
  const order = await json('post', '/orders', { title: `Export ${run}, "quoted"` });
  const risky = await json('post', '/orders', { title: `=SUM(1+1) ${run}` });
  createdOrders.push(order.id, risky.id);
  for (const [index, title] of [`Monitor ${run}`, `+cmd ${run}`].entries())
    await json('post', '/products', {
      title,
      serialNumber: Number(run.slice(-8)) + index,
      isNew: index === 0,
      type: 'Monitors',
      order: order.id,
      guarantee: { start: '2026-01-01', end: '2027-01-01' },
      price: [
        { value: 1234.5, symbol: 'UAH', isDefault: true },
        { value: 30, symbol: 'USD', isDefault: false },
      ],
    });

  browser = await chromium.launch({
    channel: process.env.AUTH_SMOKE_BROWSER_CHANNEL ?? 'msedge',
    headless: true,
  });
  const context = await browser.newContext({
    viewport: { width: 1365, height: 900 },
    reducedMotion: 'reduce',
    acceptDownloads: true,
  });
  page = await context.newPage();
  page.on('pageerror', (error) => errors.push(`${phase}: ${error.message}`));
  page.on('worker', (worker) => diagnostics.push(`${phase}: worker ${worker.url().slice(0, 90)}`));
  page.on('requestfailed', (failed) => {
    if (!/_rsc=/.test(failed.url()))
      diagnostics.push(
        `${phase}: failed ${failed.url().slice(0, 110)} ${failed.failure()?.errorText}`,
      );
  });
  page.on('console', (event) => {
    if (['error', 'warning'].includes(event.type()))
      diagnostics.push(`${phase}: ${event.type()} ${event.text().slice(0, 200)}`);
  });
  page.on('console', (event) => {
    if (event.type() === 'error' && /MISSING_MESSAGE|hydration|Hydration/.test(event.text()))
      errors.push(`${phase}: ${event.text()}`);
  });

  phase = 'sign in';
  await page.goto(base + '/login?returnTo=' + encodeURIComponent('/orders'));
  await page.getByRole('button', { name: 'EN', exact: true }).click();
  await page.getByLabel('Email', { exact: false }).fill(account.email);
  await page.getByLabel('Password', { exact: false }).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  const deadline = Date.now() + 30000;
  while (new URL(page.url()).pathname !== '/orders') {
    assert.ok(Date.now() < deadline, 'Timed out signing in');
    await page.waitForTimeout(100);
  }
  await page.waitForLoadState('load');

  phase = 'orders CSV (English)';
  await page.goto(base + `/orders?q=${encodeURIComponent(run)}`);
  await page.waitForLoadState('networkidle'); // hydrated: a click before that is lost
  const ordersDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export CSV', exact: true }).click();
  const orders = await ordersDownload;
  assert.match(orders.suggestedFilename(), /^orders-\d{4}-\d{2}-\d{2}\.csv$/);
  const ordersLines = parseCsv(await fs.readFile(await orders.path(), 'utf8'));
  assert.equal(ordersLines[0], 'ID,Title,Description,Date,Warehouse,Products,Total UAH,Total USD');
  assert.equal(ordersLines.length, 3, 'Only the orders matching the search are exported');
  const exportRow = ordersLines.find((line) => line.includes('Export'));
  assert.ok(exportRow?.includes(`"Export ${run}, ""quoted"""`), 'Quoting survives');
  assert.ok(exportRow?.endsWith(',2,2469,60'), 'Counts and per-currency totals are exported');
  assert.ok(
    ordersLines.some(
      (line) => line.includes(`"'=SUM(1+1) ${run}"`) || line.includes(`'=SUM(1+1) ${run}`),
    ),
    'A formula-looking title is neutralized',
  );

  phase = 'products CSV (Russian)';
  await page.getByRole('button', { name: 'RU', exact: true }).click();
  // The language is stored by a Server Action: wait for the page to speak Russian before navigating away.
  await page.getByRole('button', { name: 'Экспорт CSV', exact: true }).waitFor();
  await page.goto(base + `/products?type=Monitors&q=${encodeURIComponent(run)}`);
  await page.waitForLoadState('networkidle');
  const productsDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Экспорт CSV', exact: true }).click();
  const products = await productsDownload;
  const productLines = parseCsv(await fs.readFile(await products.path(), 'utf8'));
  assert.ok(productLines[0].startsWith('ID;Название;Серийный номер;Тип;Новый;'));
  assert.equal(productLines.length, 3);
  assert.ok(productLines.some((line) => line.includes(';да;') && line.includes(';1234,5;30;')));
  assert.ok(productLines.some((line) => line.includes(';нет;')));
  assert.ok(productLines.some((line) => line.includes(`'+cmd ${run}`)));
  await page.getByRole('button', { name: 'EN', exact: true }).click();
  await page.getByRole('button', { name: 'Export CSV', exact: true }).waitFor();

  phase = 'manifest and icons';
  const manifestLink = await page.locator('link[rel="manifest"]').getAttribute('href');
  assert.ok(manifestLink, 'The page links the manifest');
  const manifest = await (await apiClientGet(base + manifestLink)).json();
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.start_url, '/orders');
  for (const icon of manifest.icons) {
    const response = await apiClientGet(base + icon.src);
    assert.equal(response.status(), 200, `${icon.src} is served`);
    assert.match(response.headers()['content-type'] ?? '', /image\/png/);
  }
  assert.ok(manifest.icons.some((icon) => icon.purpose === 'maskable'));

  phase = 'service worker';
  const swResponse = await apiClientGet(base + '/sw.js');
  assert.match(swResponse.headers()['cache-control'] ?? '', /no-cache/);
  await page.goto(base + '/orders');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await page.waitForLoadState('load');
  assert.equal(
    await page.evaluate(() => Boolean(navigator.serviceWorker.controller)),
    true,
    'The worker controls the page after a reload',
  );

  phase = 'what the worker keeps';
  const cached = await page.evaluate(async () => {
    const names = await caches.keys();
    const urls = [];
    for (const name of names)
      for (const request of await (await caches.open(name)).keys())
        urls.push(new URL(request.url).pathname);
    return { names, urls };
  });
  assert.deepEqual(cached.names, ['inventory-static-v1']);
  assert.ok(cached.urls.includes('/offline.html'));
  assert.ok(
    cached.urls.some((url) => url.startsWith('/_next/static/')),
    'Static files are cached',
  );
  const personal = cached.urls.filter(
    (url) =>
      !url.startsWith('/_next/static/') && !url.startsWith('/icons/') && url !== '/offline.html',
  );
  assert.deepEqual(personal, [], 'No page, API or other response is stored');

  phase = 'offline';
  await context.setOffline(true);
  await page.goto(base + '/groups').catch(() => undefined);
  await page
    .getByRole('heading', { name: /^(You are offline|Нет подключения)$/ })
    .waitFor({ timeout: 10000 });
  assert.equal(
    await page.locator('img').evaluate((image) => image.complete && image.naturalWidth > 0),
    true,
    'The offline page shows its icon without a network',
  );
  await page.screenshot({ path: path.join(artifacts, 'offline.png') });
  await context.setOffline(false);
  await page.goto(base + '/orders');
  await page
    .getByRole('heading', { name: /^(Orders|Приходы)/ })
    .first()
    .waitFor();

  phase = 'sign out leaves no personal data on the device';
  await page.getByRole('button', { name: /^(Sign out|Выйти)$/ }).click();
  const signOutDeadline = Date.now() + 15000;
  while (new URL(page.url()).pathname !== '/login') {
    assert.ok(Date.now() < signOutDeadline, 'Timed out signing out');
    await page.waitForTimeout(100);
  }
  const after = await page.evaluate(async () => {
    const urls = [];
    for (const name of await caches.keys())
      for (const request of await (await caches.open(name)).keys())
        urls.push(new URL(request.url).pathname);
    return urls;
  });
  assert.deepEqual(
    after.filter(
      (url) =>
        !url.startsWith('/_next/static/') && !url.startsWith('/icons/') && url !== '/offline.html',
    ),
    [],
  );

  assert.deepEqual(errors, []);
  console.info(
    'Stage 7c smoke passed: orders/products CSV in both languages through the worker, formula neutralized, manifest and icons, service worker control, only static files and the offline page cached, offline page, nothing personal after sign-out.',
  );

  async function apiClientGet(url) {
    return apiClient.get(url);
  }
}

async function runSmoke() {
  try {
    await main();
  } catch (error) {
    if (page)
      await page
        .screenshot({ path: path.join(artifacts, 'failure.png'), fullPage: true })
        .catch(() => undefined);
    console.error('Stage 7c smoke failed during ' + phase, error);
    console.error(diagnostics.join('\n'));
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
