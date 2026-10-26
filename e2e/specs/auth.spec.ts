import { authenticatedCookie, expect, login, newAccount, settledAt, test } from '../fixtures';
import { apiURL, baseURL } from '../settings';

test('auth switch links navigate on the first press before blur errors can move them', async ({
  page,
}) => {
  for (const route of ['/login', '/register']) {
    const target = route === '/login' ? '/register' : '/login';
    for (const field of ['email', 'password']) {
      await page.goto(`${route}?returnTo=%2Fusers`);
      await expect(page.locator('button[type="submit"]')).toBeEnabled();
      const input = page.locator(`input[name="${field}"]`);
      await input.fill('invalid');
      if (route === '/login' && field === 'password') await input.fill('');
      const link = page.getByRole('link', {
        name: route === '/login' ? 'Create an account' : 'Already have an account? Sign in',
        exact: true,
      });
      // A physical press lets asynchronous blur validation finish before release.
      await link.click({ delay: 150 });
      await expect(page).toHaveURL(new RegExp(`${target}\\?returnTo=%2Fusers$`));
    }
  }
});

test('guests and tampered cookies cannot read protected pages or APIs', async ({
  page,
  context,
  request,
}) => {
  for (const route of [
    '/orders',
    '/orders/new',
    '/products',
    '/products/new',
    '/groups',
    '/users',
    '/settings',
  ]) {
    const response = await request.get(baseURL + route, { maxRedirects: 0 });
    expect([303, 307, 308]).toContain(response.status());
    expect(new URL(response.headers().location, baseURL).pathname).toBe('/login');
  }
  expect((await request.get(`${apiURL}/orders`)).status()).toBe(401);
  expect((await request.get(`${apiURL}/graphql?query=%7B__typename%7D`)).status()).toBe(401);
  await context.addCookies([
    { name: 'dzencode_auth', value: 'tampered', url: baseURL, httpOnly: true },
  ]);
  await page.goto('/orders');
  await expect(page.getByRole('heading', { name: 'Sign in', exact: true })).toBeVisible();
});

test('registration validates input and creates a persistent HttpOnly session', async ({
  page,
  context,
}) => {
  const account = newAccount();
  await page.goto('/register?returnTo=%2Fusers');
  const submit = page.getByRole('button', { name: 'Create account', exact: true });
  await expect(submit).toBeEnabled();
  await submit.click();
  await expect(page.locator('[aria-invalid="true"]').first()).toBeVisible();
  await page.getByLabel('First name').fill(account.firstName);
  await page.getByLabel('Last name').fill(account.lastName);
  await page.getByLabel('Email').fill(account.email);
  await page
    .getByLabel('Password', { exact: false })
    .and(page.locator('input[name="password"]'))
    .fill(account.password);
  await page.getByLabel('Confirm password').fill(account.password);
  await submit.click();
  await settledAt(page, '/users');
  await expect(page.getByText(account.email, { exact: true })).toBeVisible();
  const cookie = await authenticatedCookie(page);
  expect(cookie.httpOnly).toBe(true);
  expect(cookie.sameSite).toBe('Lax');
  expect(cookie.expires).toBeGreaterThan(Date.now() / 1000);
  expect(await page.evaluate(() => document.cookie.includes('dzencode_auth'))).toBe(false);
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain(account.password);
  const tab = await context.newPage();
  await tab.goto('/users');
  await expect(tab.getByText(account.email, { exact: true })).toBeVisible();
});

test('logout revokes a warm session in all its tabs and preserves another login', async ({
  page,
  context,
  browser,
  account,
  request,
}) => {
  await login(page, account);
  await page.reload();
  const oldCookie = await authenticatedCookie(page);
  const tab = await context.newPage();
  await tab.goto('/products');
  await expect(tab.locator('.sessions-counter--online')).toBeVisible();
  const device = await browser.newContext({ baseURL, serviceWorkers: 'block' });
  try {
    const other = await device.newPage();
    await login(other, account, '/users');
    const deviceCookie = await authenticatedCookie(other);
    await page.getByRole('button', { name: 'Sign out', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Sign in', exact: true })).toBeVisible();
    await expect(tab.getByRole('heading', { name: 'Sign in', exact: true })).toBeVisible();
    expect(
      (
        await request.get(`${apiURL}/auth/me`, {
          headers: { Authorization: `Bearer ${oldCookie.value}` },
        })
      ).status(),
    ).toBe(401);
    expect(
      (
        await request.get(`${apiURL}/auth/me`, {
          headers: { Authorization: `Bearer ${deviceCookie.value}` },
        })
      ).status(),
    ).toBe(200);
    await other.reload();
    await expect(other.getByText(account.email, { exact: true })).toBeVisible();
    await page.goto('/orders');
    await expect(page.getByRole('heading', { name: 'Sign in', exact: true })).toBeVisible();
  } finally {
    await device.close();
  }
});
