import { expect, test } from '../fixtures';

test('two tabs receive writes, report changes and a deleted-panel notice without reload', async ({
  page,
  context,
  inventory,
  signedIn: _signedIn,
}) => {
  const tab = await context.newPage();
  await tab.goto('/orders');
  const counter = (target: typeof page) => target.locator('.sessions-counter__value');
  await expect(counter(page)).toHaveText('2');
  await expect(counter(tab)).toHaveText('2');
  const order = await inventory.order('live');
  for (const target of [page, tab]) {
    await expect(target.locator('.order-item', { hasText: order.title })).toBeVisible();
  }
  await inventory.product(order.id);
  await expect(
    tab.locator('.order-item', { hasText: order.title }).locator('.order-item__count-number'),
  ).toHaveText('1');
  await tab.goto('/groups');
  await expect(
    tab.getByRole('table', { name: 'Product count by type', exact: true }),
  ).toBeVisible();
  await expect(tab.locator('.sessions-counter--online')).toBeVisible();
  const count = tab.locator('.groups-content__cards dd').nth(1);
  const before = Number((await count.innerText()).replaceAll(',', ''));
  await inventory.product(order.id, 'second');
  await expect(count).toHaveText(String(before + 1));
  await tab.goto(`/orders?order=${order.id}&q=${encodeURIComponent(inventory.prefix)}`);
  await expect(tab.locator('#order-panel-title')).toHaveText(order.title);
  await expect(tab.locator('.sessions-counter--online')).toBeVisible();
  await inventory.json('DELETE', `/orders/${order.id}`);
  await expect(
    tab.getByText('This order was deleted in another tab.', { exact: true }),
  ).toBeVisible();
  await expect.poll(() => new URL(tab.url()).searchParams.has('order')).toBe(false);
  expect(new URL(tab.url()).searchParams.get('q')).toBe(inventory.prefix);
  await expect(tab.locator('.order-panel')).toHaveCount(0);
  await tab.getByRole('button', { name: 'Dismiss', exact: true }).click();
  await expect(tab.getByText('This order was deleted in another tab.')).toHaveCount(0);
  await tab.close();
  await expect(counter(page)).toHaveText('1');
});

test('a disconnected socket catches up with missed writes after reconnect', async ({
  page,
  inventory,
  signedIn: _signedIn,
}) => {
  let blocked = false;
  const connections: { close: () => Promise<void> }[] = [];
  await page.routeWebSocket('**/socket.io/**', async (socket) => {
    if (blocked) {
      await socket.close();
      return;
    }
    const server = socket.connectToServer();
    connections.push({
      close: async () => {
        await socket.close();
        await server.close();
      },
    });
  });
  await page.reload();
  await expect(page.locator('.sessions-counter--online')).toBeVisible();
  blocked = true;
  for (const connection of connections.splice(0)) await connection.close();
  await expect(page.locator('.sessions-counter__value')).toHaveText('—');
  const order = await inventory.order('missed while disconnected');
  await expect(page.locator('.order-item', { hasText: order.title })).toHaveCount(0);
  blocked = false;
  await expect(page.locator('.order-item', { hasText: order.title })).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.locator('.sessions-counter--online')).toBeVisible();
});
