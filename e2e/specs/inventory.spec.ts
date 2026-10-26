import { expect, test } from '../fixtures';
import { baseURL } from '../settings';

test('forms cannot accept input or submit a GET before JavaScript is ready', async ({
  browser,
  context,
  inventory,
  signedIn: _signedIn,
}) => {
  const order = await inventory.order('no-js form context');
  const noScript = await browser.newContext({
    baseURL,
    javaScriptEnabled: false,
    storageState: await context.storageState(),
  });
  try {
    const page = await noScript.newPage();
    for (const route of ['/orders/new', `/products/new?order=${order.id}`]) {
      await page.goto(route);
      await expect(page.locator('.form-layout')).toHaveAttribute('method', 'post');
      await expect(page.getByLabel('Title', { exact: false })).toBeDisabled();
      await expect(page.locator('.form-layout button[type="submit"]')).toBeDisabled();
    }
  } finally {
    await noScript.close();
  }
});

test('creates an order and product, searches, filters and confirms deletion', async ({
  page,
  inventory,
  signedIn: _signedIn,
}) => {
  const title = `${inventory.prefix} created in browser`;
  await page.goto('/orders/new');
  await page.getByLabel('Title', { exact: false }).fill(title);
  await expect
    .poll(() => page.evaluate((title) => JSON.stringify(localStorage).includes(title), title))
    .toBe(true);
  await page.getByRole('button', { name: 'Create order', exact: true }).click();
  await expect(page.locator('#order-panel-title')).toHaveText(title);
  const order = Number(new URL(page.url()).searchParams.get('order'));
  expect(order).toBeGreaterThan(0);
  inventory.trackOrder(order);
  await page.goto(`/products/new?order=${order}`);
  await expect(page.getByLabel('Order', { exact: false })).toHaveValue(String(order));
  await page.getByLabel('Title', { exact: false }).fill(`${inventory.prefix} monitor`);
  await page.getByLabel('Serial number').fill('987654');
  await page.getByLabel('Type', { exact: false }).selectOption('Monitors');
  await page.getByLabel('Warranty starts').fill('2026-01-01');
  await page.getByLabel('Warranty ends').fill('2025-01-01');
  await page.getByLabel('Price, $', { exact: false }).fill('30');
  await page.getByLabel('Price, UAH', { exact: false }).fill('1234.50');
  await page.getByRole('button', { name: 'Create product', exact: true }).click();
  await expect(page.getByLabel('Warranty ends')).toHaveAttribute('aria-invalid', 'true');
  await page.getByLabel('Warranty ends').fill('2027-01-01');
  await page.getByRole('button', { name: 'Create product', exact: true }).click();
  await expect(page.getByRole('region', { name: title, exact: true })).toContainText(
    `${inventory.prefix} monitor`,
  );
  await page.goto('/products');
  await page.getByRole('searchbox').fill(inventory.prefix);
  await expect.poll(() => new URL(page.url()).searchParams.get('q')).toBe(inventory.prefix);
  await expect(page.locator('.product-row')).toHaveCount(1);
  await page.getByRole('combobox').selectOption('Laptops');
  await expect(page.locator('.product-row')).toHaveCount(0);
  await page.getByRole('combobox').selectOption('Monitors');
  await expect(page.locator('.product-row')).toHaveCount(1);
  await page.reload();
  await expect(page.getByRole('combobox')).toHaveValue('Monitors');
  await expect(page.getByRole('searchbox')).toHaveValue(inventory.prefix);
  await page
    .locator('.product-row')
    .getByRole('button', { name: /Delete product/ })
    .click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.locator('.product-row')).toHaveCount(1);
  await page
    .locator('.product-row')
    .getByRole('button', { name: /Delete product/ })
    .click();
  await dialog.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(page.locator('.product-row')).toHaveCount(0);
  await page.goto(`/orders?q=${encodeURIComponent(inventory.prefix)}`);
  await page
    .locator('.order-item')
    .getByRole('button', { name: /Delete order/ })
    .click();
  await dialog.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(page.locator('.order-item')).toHaveCount(0);
});

test('language changes preserve the URL and draft, reload restores it and saving clears it', async ({
  page,
  inventory,
  signedIn: _signedIn,
}) => {
  const title = `${inventory.prefix} draft`;
  await page.goto('/orders/new?source=e2e');
  await page.getByLabel('Title', { exact: false }).fill(title);
  await expect
    .poll(() => page.evaluate((title) => JSON.stringify(localStorage).includes(title), title))
    .toBe(true);
  await page.getByRole('button', { name: 'RU', exact: true }).click();
  await expect(page.getByLabel('Название', { exact: false })).toHaveValue(title);
  expect(new URL(page.url()).searchParams.get('source')).toBe('e2e');
  await page.reload();
  await expect(page.getByLabel('Название', { exact: false })).toHaveValue(title);
  await page.getByRole('button', { name: 'EN', exact: true }).click();
  await expect(page.getByLabel('Title', { exact: false })).toHaveValue(title);
  await page.getByRole('button', { name: 'Create order', exact: true }).click();
  await expect(page.locator('#order-panel-title')).toHaveText(title);
  inventory.trackOrder(Number(new URL(page.url()).searchParams.get('order')));
  await page.goto('/orders/new');
  await expect(page.getByLabel('Title', { exact: false })).toHaveValue('');
  await expect
    .poll(() => page.evaluate((title) => JSON.stringify(localStorage).includes(title), title))
    .toBe(false);
});
