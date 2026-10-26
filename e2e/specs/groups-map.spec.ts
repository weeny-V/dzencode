import { expect, test, type Warehouse } from '../fixtures';

test('Groups matches GraphQL totals, changes currency and lazily draws charts and relations', async ({
  page,
  inventory,
  signedIn: _signedIn,
}) => {
  const order = await inventory.order('graph node');
  await inventory.product(order.id);
  const query = `query { inventoryStatistics(currency: UAH) { ordersCount productsCount value missingPrices } }`;
  const { data, errors } = await inventory.json<{
    data: {
      inventoryStatistics: {
        ordersCount: number;
        productsCount: number;
        value: number;
        missingPrices: number;
      };
    };
    errors?: unknown;
  }>('GET', `/graphql?query=${encodeURIComponent(query)}`);
  expect(errors).toBeUndefined();
  await page.setViewportSize({ width: 390, height: 500 });
  await page.goto('/groups');
  await expect(
    page.getByRole('table', { name: 'Product count by type', exact: true }),
  ).toBeVisible();
  const cards = page.locator('.groups-content__cards dd');
  await expect(cards.nth(0)).toHaveText(String(data.inventoryStatistics.ordersCount));
  await expect(cards.nth(1)).toHaveText(String(data.inventoryStatistics.productsCount));
  await expect(cards.nth(3)).toHaveText(String(data.inventoryStatistics.missingPrices));
  await expect(page.locator('.inventory-chart [role="status"]').first()).toBeVisible();
  await expect(page.locator('.inventory-graph__canvas canvas')).toHaveCount(0);
  await page.locator('.inventory-chart').first().scrollIntoViewIfNeeded();
  await expect(page.locator('.inventory-chart').first().locator('[role="status"]')).toHaveCount(0);
  await expect(page.locator('.inventory-chart canvas').first()).toBeVisible();
  await page.locator('.inventory-graph').scrollIntoViewIfNeeded();
  await expect(page.locator('.inventory-graph__canvas canvas').first()).toBeVisible();
  await expect
    .poll(async () => {
      const graph = page.locator('.inventory-graph__canvas');
      return Number(await graph.getAttribute('data-nodes'));
    })
    .toBeGreaterThan(0);
  const graph = page.locator('.inventory-graph__canvas');
  await expect(graph).toHaveAttribute(
    'data-visible-nodes',
    (await graph.getAttribute('data-nodes'))!,
  );
  await page.getByRole('button', { name: 'Fit to view', exact: true }).click();
  await expect(
    page.getByRole('table', { name: 'Warehouse, order and product-type relations', exact: true }),
  ).toContainText(order.title);
  await page.getByRole('link', { name: 'USD', exact: true }).click();
  await expect(page.getByRole('link', { name: 'USD', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await page.reload();
  await expect(page.getByRole('link', { name: 'USD', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  );
});

test('warehouse map loads on demand, uses fixture tiles and retries a tile failure', async ({
  page,
  context,
  inventory,
  signedIn: _signedIn,
}) => {
  const [warehouse] = await inventory.json<Warehouse[]>('GET', '/warehouses');
  const order = await inventory.order('mapped', warehouse.id);
  let requests = 0;
  let failed = true;
  await context.route('https://tiles.inventory.test/**', async (route) => {
    requests += 1;
    if (failed) await route.fulfill({ status: 503, body: 'Controlled tile failure' });
    else await route.fallback();
  });
  await page.goto(`/orders?order=${order.id}`);
  await expect(page.getByRole('heading', { name: warehouse.name, exact: true })).toBeVisible();
  await expect(page.locator('.leaflet-container')).toHaveCount(0);
  expect(requests).toBe(0);
  await page.getByRole('button', { name: 'Show map', exact: true }).click();
  await expect(page.locator('.warehouse-location [role="alert"]')).toBeVisible();
  await expect(page.locator('.warehouse-location')).toContainText(warehouse.address);
  failed = false;
  await page.getByRole('button', { name: 'Retry map', exact: true }).click();
  await expect(page.locator('.leaflet-marker-icon')).toHaveAttribute('title', warehouse.name);
  await expect(page.locator('.warehouse-location [role="alert"]')).toHaveCount(0);
  await expect.poll(() => requests).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Hide map', exact: true }).click();
  await expect(page.locator('.leaflet-container')).toHaveCount(0);
  await page.setViewportSize({ width: 375, height: 812 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});
