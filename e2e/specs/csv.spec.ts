import { readFile } from 'node:fs/promises';

import { expect, test } from '../fixtures';

test('downloads filtered orders and products through a worker with EN and RU CSV formats', async ({
  page,
  inventory,
  signedIn: _signedIn,
}) => {
  const order = await inventory.order('comma, "quoted"');
  const title = `=SUM(1+1) ${inventory.prefix}`;
  const risky = await inventory.json<{ id: number }>('POST', '/orders', { title });
  inventory.trackOrder(risky.id);
  await inventory.product(order.id, 'monitor');
  await inventory.product(order.id, '+second');
  await inventory.product(order.id, 'excluded laptop', 'Laptops');
  await page.goto(`/orders?q=${encodeURIComponent(inventory.prefix)}`);
  await expect(page.locator('.order-item')).toHaveCount(2);
  const worker = page.waitForEvent('worker');
  const downloadedOrders = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export CSV', exact: true }).click();
  await worker;
  const orders = await downloadedOrders;
  expect(orders.suggestedFilename()).toMatch(/^orders-\d{4}-\d{2}-\d{2}\.csv$/);
  const bytes = await readFile(await orders.path());
  expect([...bytes.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
  const lines = bytes.toString('utf8').slice(1).trimEnd().split('\r\n');
  expect(lines).toHaveLength(3);
  expect(lines[0]).toBe('ID,Title,Description,Date,Warehouse,Products,Total UAH,Total USD');
  expect(lines.join('\n')).toContain('comma, ""quoted""');
  expect(lines.join('\n')).toContain(`'${title}`);
  expect(lines.find((line) => line.includes('quoted'))).toMatch(/,3,3703.5,90$/);
  await page.getByRole('button', { name: 'RU', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Экспорт CSV', exact: true })).toBeVisible();
  await page.goto(`/products?type=Monitors&q=${encodeURIComponent(inventory.prefix)}`);
  await expect(page.locator('.product-row')).toHaveCount(2);
  const downloadedProducts = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Экспорт CSV', exact: true }).click();
  const products = await downloadedProducts;
  const content = await readFile(await products.path(), 'utf8');
  expect(content.charCodeAt(0)).toBe(0xfeff);
  const productLines = content.slice(1).trimEnd().split('\r\n');
  expect(productLines).toHaveLength(3);
  expect(productLines[0]).toMatch(/^ID;Название;Серийный номер;Тип;/);
  expect(content).toContain(';1234,5;30;');
  expect(content).not.toContain('excluded laptop');
});
