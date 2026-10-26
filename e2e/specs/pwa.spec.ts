import { expect, test } from '../fixtures';

test.use({ serviceWorkers: 'allow' });

test('production manifest, static-only cache and offline fallback survive sign-out', async ({
  page,
  context,
  request,
  signedIn: _signedIn,
}) => {
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(href).toBeTruthy();
  const response = await request.get(href!);
  expect(response.ok()).toBe(true);
  const manifest = (await response.json()) as {
    display: string;
    start_url: string;
    icons: { src: string; purpose?: string }[];
  };
  expect(manifest.display).toBe('standalone');
  expect(manifest.start_url).toBe('/orders');
  expect(manifest.icons.some((icon) => icon.purpose === 'maskable')).toBe(true);
  for (const icon of manifest.icons) {
    const response = await request.get(icon.src);
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('image/png');
  }
  const sw = await request.get('/sw.js');
  expect(sw.headers()['cache-control']).toContain('no-cache');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
    .toBe(true);
  const cached = () =>
    page.evaluate(async () => {
      const urls: string[] = [];
      for (const name of await caches.keys()) {
        const cache = await caches.open(name);
        for (const request of await cache.keys()) urls.push(new URL(request.url).pathname);
      }
      return urls;
    });
  const assertStaticOnly = async () => {
    const urls = await cached();
    expect(urls).toContain('/offline.html');
    expect(urls.some((url) => url.startsWith('/_next/static/'))).toBe(true);
    expect(
      urls.filter(
        (url) =>
          !url.startsWith('/_next/static/') &&
          !url.startsWith('/icons/') &&
          url !== '/offline.html',
      ),
    ).toEqual([]);
  };
  await assertStaticOnly();
  await context.setOffline(true);
  try {
    await page.goto('/groups');
    await expect(
      page.getByRole('heading', { name: /^(You are offline|Нет подключения)$/ }),
    ).toBeVisible();
    expect(
      await page
        .locator('img')
        .evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0),
    ).toBe(true);
  } finally {
    await context.setOffline(false);
  }
  await page.goto('/orders');
  await expect(page.locator('.sessions-counter--online')).toBeVisible();
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Sign in', exact: true })).toBeVisible();
  await assertStaticOnly();
});
