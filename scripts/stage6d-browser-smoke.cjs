// Local-only production integration smoke. All map traffic uses controlled fixtures.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const zlib = require('node:zlib');
const { chromium, request } = require(process.env.PLAYWRIGHT_PACKAGE ?? 'playwright');

const base = process.env.STAGE6D_SMOKE_BASE_URL ?? 'http://localhost:3064';
const api = process.env.STAGE6D_SMOKE_API_URL ?? 'http://localhost:4064';
const artifacts = process.env.STAGE6D_SMOKE_ARTIFACTS ?? path.resolve('test-results/stage6d');
const mapMode = process.env.STAGE6D_SMOKE_MAP_MODE ?? 'fixtures';
assert.equal(
  process.env.STAGE6D_SMOKE_ALLOW_WRITES,
  '1',
  'Explicit isolated test-data authorization required.',
);
for (const url of [base, api])
  assert.ok(['localhost', '127.0.0.1'].includes(new URL(url).hostname));
assert.ok(['fixtures', 'unconfigured'].includes(mapMode));

const password = 'stage 6d browser test password';
const run = String(Date.now());
const accounts = ['a', 'b'].map((id) => ({
  firstName: 'Stage6d',
  lastName: id.toUpperCase(),
  email: `stage6d-${id}-${run}@example.com`,
  password,
  passwordConfirmation: password,
}));
const contexts = [];
const createdOrders = [];
const requests = [];
const errors = [];
const external = [];
const pendingTiles = [];
let tileMode = 'ok';
let tileCount = 0;
let blockChart = false;
let browser;
let apiClient;
let page;
let phase = 'startup';
let token;
let libraries;
const tile =
  '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="#edf3e8"/><path d="M0 128H256M128 0V256" stroke="white" stroke-width="16"/><text x="12" y="28" fill="#506040">Controlled tile fixture</text></svg>';

async function findLibraries() {
  const directory = path.resolve('client/.next/static/chunks');
  const entries = {};
  for (const file of await fs.readdir(directory)) {
    if (!/\.(js|css)$/.test(file)) continue;
    const bytes = await fs.readFile(path.join(directory, file));
    const source = bytes.toString();
    const kind = source.includes('chartjs')
      ? 'chart'
      : source.includes('cytoscape')
        ? 'graph'
        : source.includes('Leaflet')
          ? 'map'
          : source.includes('.leaflet-container')
            ? 'mapCss'
            : undefined;
    if (kind) entries[kind] = { file, bytes: bytes.length, gzip: zlib.gzipSync(bytes).length };
  }
  for (const kind of ['chart', 'graph', 'map', 'mapCss'])
    assert.ok(entries[kind], `Missing deferred ${kind} entry`);
  return entries;
}
const loaded = (kind, urls = requests) =>
  urls.some((url) => new URL(url).pathname.endsWith('/' + libraries[kind].file));
async function context() {
  const value = await browser.newContext({
    viewport: { width: 1365, height: 900 },
    reducedMotion: 'reduce',
  });
  contexts.push(value);
  await value.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.hostname === 'stage6d-tiles.invalid') {
      tileCount += 1;
      if (tileMode === 'stall' && tileCount > 1)
        await new Promise((resolve) => pendingTiles.push(resolve));
      try {
        await route.fulfill(
          tileMode === 'fail'
            ? { status: 503, body: 'Controlled tile failure' }
            : {
                status: 200,
                contentType: 'image/svg+xml',
                body: tile,
                headers: { 'Cache-Control': 'public, max-age=604800' },
              },
        );
      } catch {
        /* Removing a map deliberately aborts pending image requests. */
      }
      return;
    }
    if (![new URL(base).origin, new URL(api).origin].includes(url.origin)) {
      external.push(url.origin);
      await route.abort();
      return;
    }
    if (blockChart && url.pathname.endsWith('/' + libraries.chart.file)) {
      await route.fulfill({ status: 503, body: 'Controlled chart-chunk failure' });
      return;
    }
    await route.continue();
  });
  value.on('page', (p) => {
    p.on('request', (req) => requests.push(req.url()));
    p.on('pageerror', (error) => errors.push(phase + ': ' + error.message));
    p.on('console', (event) => {
      if (event.type() === 'error' && /MISSING_MESSAGE|hydration|Hydration/.test(event.text()))
        errors.push(phase + ': ' + event.text());
    });
  });
  return value;
}
async function json(method, route, data) {
  const response = await apiClient[method](api + route, {
    data,
    headers: token ? { Authorization: 'Bearer ' + token } : {},
  });
  assert.ok(response.ok(), `${method} ${route} returned ${response.status()}`);
  return response.status() === 204 ? undefined : response.json();
}
async function graphql(query, variables) {
  const search = new URLSearchParams({ query, variables: JSON.stringify(variables) });
  const body = await json('get', '/graphql?' + search);
  assert.equal(body.errors, undefined);
  return body.data;
}
async function login(account, returnTo) {
  await page.goto(base + '/login?returnTo=' + encodeURIComponent(returnTo));
  await page.getByRole('button', { name: 'EN', exact: true }).click();
  await page.getByLabel('Email', { exact: false }).fill(account.email);
  await page.getByLabel('Password', { exact: false }).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await settledAt((url) => url.pathname === new URL(returnTo, base).pathname);
}
async function logout() {
  await page.getByRole('button', { name: /^(Sign out|Выйти)$/ }).click();
  await settledAt((url) => url.pathname === '/login');
}
// Sign-in/out start a hard navigation and the tab's own auth-change reload, so the first navigation is aborted
// by design. Poll the URL instead of waiting on one navigation, then wait for the final document.
async function settledAt(predicate) {
  const deadline = Date.now() + 30000;
  while (!predicate(new URL(page.url()))) {
    assert.ok(Date.now() < deadline, 'Timed out waiting for ' + page.url());
    await page.waitForTimeout(100);
  }
  await page.waitForLoadState('load');
}
async function showMap(name) {
  await page.getByRole('button', { name: /^(Show map|Показать карту)$/ }).click();
  await page.locator('.warehouse-location .leaflet-marker-icon').waitFor();
  assert.equal(
    await page.locator('.warehouse-location .leaflet-marker-icon').getAttribute('title'),
    name,
  );
  await page.locator('.warehouse-location [role="status"]').waitFor({ state: 'detached' });
}
async function markerCentered() {
  await page.waitForFunction(() => {
    const box = document.querySelector('.warehouse-location__map')?.getBoundingClientRect();
    const marker = document.querySelector('.leaflet-marker-icon')?.getBoundingClientRect();
    return box && marker && Math.abs(marker.x + marker.width / 2 - box.x - box.width / 2) <= 2;
  });
  const box = await page.locator('.warehouse-location__map').boundingBox();
  const marker = await page.locator('.leaflet-marker-icon').boundingBox();
  assert.ok(box && marker);
  assert.ok(
    Math.abs(marker.x + marker.width / 2 - box.x - box.width / 2) <= 2,
    'Resize must preserve marker center',
  );
}
async function main() {
  await fs.mkdir(artifacts, { recursive: true });
  libraries = await findLibraries();
  apiClient = await request.newContext();
  const first = await json('post', '/auth/register', accounts[0]);
  token = first.token;
  const second = await apiClient.post(api + '/auth/register', { data: accounts[1] });
  assert.equal(second.status(), 201);
  const warehouses = await json('get', '/warehouses');
  assert.ok(warehouses.length >= 2);
  const type = (await json('get', '/product-types'))[0].name;
  const orders = [];
  for (const warehouseId of [warehouses[0].id, warehouses[1].id, null]) {
    const order = await json('post', '/orders', {
      title: `Stage6d ${run} ${orders.length}`,
      warehouseId,
    });
    orders.push(order);
    createdOrders.push(order.id);
  }
  for (const [index, prices] of [
    [
      { value: 220, symbol: 'UAH', isDefault: true },
      { value: 5.5, symbol: 'USD', isDefault: false },
    ],
    [{ value: 0, symbol: 'UAH', isDefault: true }],
    [{ value: 0, symbol: 'USD', isDefault: true }],
  ].entries())
    await json('post', '/products', {
      title: `Stage6d product ${run} ${index}`,
      serialNumber: Number(run.slice(-8)) + index,
      isNew: true,
      type,
      order: orders[index].id,
      guarantee: { start: '2026-01-01', end: '2027-01-01' },
      price: prices,
    });
  const expected = (
    await graphql(
      'query ($c: Currency!) { inventoryStatistics(currency: $c) { ordersCount productsCount missingPrices } }',
      { c: 'UAH' },
    )
  ).inventoryStatistics;
  browser = await chromium.launch({
    channel: process.env.AUTH_SMOKE_BROWSER_CHANNEL ?? 'msedge',
    headless: true,
  });
  const ctx = await context();
  page = await ctx.newPage();
  phase = 'protected map and deferred modules';
  await login(accounts[0], '/orders?order=' + orders[0].id);
  await page.getByRole('heading', { name: warehouses[0].name, exact: true }).waitFor();
  assert.equal(loaded('chart'), false);
  assert.equal(loaded('map'), false);
  assert.equal(loaded('mapCss'), false);
  assert.equal(tileCount, 0);
  if (mapMode === 'fixtures') {
    await showMap(warehouses[0].name);
    assert.ok(loaded('map') && loaded('mapCss') && tileCount > 0);
    for (const width of [390, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      await markerCentered();
    }
    await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
    await page.getByRole('region', { name: 'Warehouse location', exact: true }).press('ArrowRight');
    await page.getByRole('button', { name: 'Hide map', exact: true }).click();
    assert.equal(await page.locator('.leaflet-container').count(), 0);
    await showMap(warehouses[0].name);
    await page.screenshot({ path: path.join(artifacts, 'warehouse-map-en.png'), fullPage: true });
    await page.goto(base + '/orders?order=' + orders[1].id);
    tileMode = 'fail';
    await page.getByRole('button', { name: 'Show map', exact: true }).click();
    await page.locator('.warehouse-location [role="alert"]').waitFor();
    assert.ok(
      (await page.locator('.warehouse-location').innerText()).includes(warehouses[1].address),
    );
    tileMode = 'ok';
    await page.getByRole('button', { name: 'Retry map', exact: true }).click();
    await page.locator('.leaflet-marker-icon').waitFor();
    assert.equal(
      await page.locator('.leaflet-marker-icon').getAttribute('title'),
      warehouses[1].name,
    );
    await page.goto(base + '/orders?order=' + orders[0].id);
    tileMode = 'stall';
    tileCount = 0;
    await page.getByRole('button', { name: 'Show map', exact: true }).click();
    await page.locator('.warehouse-location [role="alert"]').waitFor({ timeout: 16_000 });
    assert.ok(tileCount > 1, 'Use multiple tiles to verify the initial aggregate deadline');
    tileMode = 'ok';
    for (const release of pendingTiles.splice(0)) release();
    await page.getByRole('button', { name: 'Retry map', exact: true }).click();
    await page.locator('.leaflet-marker-icon').waitFor();
  } else {
    await page.getByRole('button', { name: 'Show map', exact: true }).click();
    await page.locator('.warehouse-location [role="alert"]').waitFor();
    assert.equal(tileCount, 0);
  }
  await page.goto(base + '/orders?order=' + orders[2].id);
  await page.getByText('No warehouse assigned', { exact: true }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Show map', exact: true }).count(), 0);
  phase = 'statistics and chart visibility';
  blockChart = true;
  await page.setViewportSize({ width: 390, height: 500 });
  await page.goto(base + '/groups');
  await page.getByRole('table', { name: 'Product count by type', exact: true }).waitFor();
  assert.equal(loaded('chart'), false, 'Do not request chart code before its section is visible');
  await page.locator('.inventory-chart').first().scrollIntoViewIfNeeded();
  await page.locator('.inventory-chart [role="alert"]').first().waitFor();
  assert.equal(await page.getByRole('table').count(), 3, 'Exact values survive chunk failure');
  blockChart = false;
  await page.getByRole('button', { name: 'Retry chart', exact: true }).first().click();
  await page.locator('.inventory-chart [role="alert"]').first().waitFor({ state: 'detached' });
  assert.ok(loaded('chart'));
  assert.equal(loaded('graph'), false, 'Do not request graph code before its section is visible');
  await page.locator('.inventory-graph').scrollIntoViewIfNeeded();
  await page.locator('.inventory-graph__canvas canvas').first().waitFor();
  assert.ok(loaded('graph'));
  const drawn = await page
    .locator('.inventory-graph__canvas')
    .evaluate((element) => ({ ...element.dataset }));
  assert.ok(Number(drawn.nodes) >= 8, 'The graph holds its nodes');
  assert.equal(drawn.visibleNodes, drawn.nodes, 'Every graph node is drawn');
  await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
  await page.getByRole('button', { name: 'Fit to view', exact: true }).click();
  await page
    .getByRole('table', { name: 'Warehouse, order and product-type relations', exact: true })
    .getByRole('rowheader', { name: 'Stage6d ' + run + ' 0', exact: true })
    .waitFor();
  const cards = await page.locator('.groups-content__cards dd').allTextContents();
  assert.equal(Number(cards[0].replaceAll(',', '')), expected.ordersCount);
  assert.equal(Number(cards[1].replaceAll(',', '')), expected.productsCount);
  assert.equal(Number(cards[3].replaceAll(',', '')), expected.missingPrices);
  await page.getByRole('link', { name: 'USD', exact: true }).click();
  await page.waitForURL((url) => url.searchParams.get('currency') === 'USD');
  await page.reload();
  await page.getByRole('link', { name: 'USD', exact: true }).waitFor();
  assert.equal(
    await page.getByRole('link', { name: 'USD', exact: true }).getAttribute('aria-current'),
    'page',
  );
  await page.getByRole('button', { name: 'RU', exact: true }).click();
  await page.getByRole('table', { name: 'Количество продуктов по типам', exact: true }).waitFor();
  assert.equal(new URL(page.url()).searchParams.get('currency'), 'USD');
  await page.setViewportSize({ width: 1365, height: 900 });
  await page.locator('.inventory-chart').last().scrollIntoViewIfNeeded();
  await page.locator('.inventory-chart [role="status"]').last().waitFor({ state: 'detached' });
  await page.waitForFunction(
    () => {
      const box = document.querySelector('.inventory-graph__canvas');
      const canvas = box?.querySelector('canvas');
      return (
        canvas &&
        Math.abs(canvas.getBoundingClientRect().width - box.getBoundingClientRect().width) < 4
      );
    },
    undefined,
    { timeout: 10000 },
  );
  await page.screenshot({ path: path.join(artifacts, 'groups-ru.png'), fullPage: true });
  if (mapMode === 'fixtures') {
    await page.goto(base + '/orders?order=' + orders[0].id);
    await showMap(warehouses[0].name);
    await page.getByRole('button', { name: 'Приблизить', exact: true }).waitFor();
    await page.screenshot({ path: path.join(artifacts, 'warehouse-map-ru.png'), fullPage: true });
  }
  phase = 'warehouse draft ownership and localization';
  await page.goto(base + '/orders/new');
  await page.getByRole('textbox', { name: 'Название', exact: true }).fill('Warehouse draft A');
  await page
    .getByRole('combobox', { name: 'Склад', exact: true })
    .selectOption(String(warehouses[0].id));
  await page.getByRole('button', { name: 'EN', exact: true }).click();
  assert.equal(
    await page.getByRole('textbox', { name: 'Title', exact: true }).inputValue(),
    'Warehouse draft A',
  );
  assert.equal(
    await page.getByRole('combobox', { name: 'Warehouse', exact: true }).inputValue(),
    String(warehouses[0].id),
  );
  await page.reload();
  await page.waitForFunction(
    () => document.querySelector('input[name="title"]')?.value === 'Warehouse draft A',
  );
  await logout();
  await login(accounts[1], '/orders/new');
  assert.equal(await page.getByRole('textbox', { name: 'Title', exact: true }).inputValue(), '');
  assert.equal(
    await page.getByRole('combobox', { name: 'Warehouse', exact: true }).inputValue(),
    '',
  );
  await page.getByRole('textbox', { name: 'Title', exact: true }).fill('Warehouse draft B');
  await page
    .getByRole('combobox', { name: 'Warehouse', exact: true })
    .selectOption(String(warehouses[1].id));
  await logout();
  await login(accounts[0], '/orders/new');
  await page.waitForFunction(
    () => document.querySelector('input[name="title"]')?.value === 'Warehouse draft A',
  );
  assert.equal(
    await page.getByRole('combobox', { name: 'Warehouse', exact: true }).inputValue(),
    String(warehouses[0].id),
  );
  const cookie = (await ctx.cookies(base)).find((entry) => entry.name === 'dzencode_auth');
  assert.ok(cookie?.httpOnly);
  const identityResponse = await apiClient.get(api + '/auth/me', {
    headers: { Authorization: 'Bearer ' + cookie.value },
  });
  const identity = await identityResponse.json();
  const key = 'inventory:draft:v1:user:' + identity.user.id + ':order';
  for (const warehouseId of [undefined, '2147483647']) {
    await page.evaluate(
      ({ key, warehouseId }) =>
        localStorage.setItem(
          key,
          JSON.stringify({
            version: 1,
            updatedAt: Date.now(),
            revision: 'legacy',
            values: {
              title: 'Legacy warehouse draft',
              description: 'Retained',
              date: '',
              ...(warehouseId === undefined ? {} : { warehouseId }),
            },
          }),
        ),
      { key, warehouseId },
    );
    await page.reload();
    await page.waitForFunction(
      () => document.querySelector('input[name="title"]')?.value === 'Legacy warehouse draft',
    );
    assert.equal(
      await page.getByRole('combobox', { name: 'Warehouse', exact: true }).inputValue(),
      '',
    );
  }
  phase = 'warm-cache guest and revoked-session denial';
  await page.goto(base + '/groups');
  await page.getByRole('table').first().waitFor();
  await logout();
  for (const route of ['/warehouses', '/graphql?query=%7B__typename%7D']) {
    assert.equal((await apiClient.get(api + route)).status(), 401);
    assert.equal(
      (
        await apiClient.get(api + route, { headers: { Authorization: 'Bearer ' + cookie.value } })
      ).status(),
      401,
    );
  }
  const guest = await context();
  const guestPage = await guest.newPage();
  for (const route of ['/groups?currency=USD', '/orders/new', '/orders?order=' + orders[0].id]) {
    await guestPage.goto(base + route);
    await guestPage.waitForURL((url) => url.pathname === '/login');
    assert.equal(await guestPage.locator('.groups-content__cards,.warehouse-location').count(), 0);
  }
  assert.deepEqual(external, []);
  assert.deepEqual(errors, []);
  assert.deepEqual(
    requests.filter(
      (url) =>
        new URL(url).origin === new URL(api).origin &&
        /^\/(orders|products|warehouses|statistics)(\/|\?|$)/.test(new URL(url).pathname),
    ),
    [],
    'Inventory reads stay on the Next server',
  );
  await fs.writeFile(
    path.join(artifacts, 'evidence.json'),
    JSON.stringify({ libraries, requests, expected, mapMode }, null, 2),
  );
  console.info(
    'Stage 6d integrated browser smoke passed: protected reports/options, EN/RU, owned warehouse drafts, coherent currencies, lazy charts/graph/maps, failures/retry, resize and revoked-cache denial.',
  );
}
async function runSmoke() {
  try {
    await main();
  } catch (error) {
    if (page) {
      try {
        await page.screenshot({ path: path.join(artifacts, 'failure.png'), fullPage: true });
      } catch {
        /* Preserve the original failure if the page has closed. */
      }
    }
    console.error('Stage 6d smoke failed during ' + phase, error);
    process.exitCode = 1;
  } finally {
    for (const release of pendingTiles.splice(0)) release();
    for (const ctx of contexts) await ctx.close();
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
