// Local-only production smoke. Browser instrumentation may inspect HttpOnly cookies; application JS must not.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium, request } = require(process.env.PLAYWRIGHT_PACKAGE ?? 'playwright');

const base = process.env.AUTH_SMOKE_BASE_URL ?? 'http://127.0.0.1:3011';
const api = process.env.AUTH_SMOKE_API_URL ?? 'http://127.0.0.1:4011';
const artifacts = process.env.AUTH_SMOKE_ARTIFACTS ?? path.resolve('test-results/auth');
assert.equal(
  process.env.AUTH_SMOKE_ALLOW_WRITES,
  '1',
  'Set AUTH_SMOKE_ALLOW_WRITES=1 for this isolated local test database.',
);
for (const url of [base, api])
  assert.ok(
    ['127.0.0.1', 'localhost'].includes(new URL(url).hostname),
    'Smoke must target isolated loopback services.',
  );

const run = String(Date.now());
const password = 'browser test password 123';
const accountA = {
  firstName: 'Browser',
  lastName: 'Alpha',
  email: 'auth-a-' + run + '@example.com',
  password,
  passwordConfirmation: password,
};
const accountB = {
  firstName: 'B'.repeat(100),
  lastName: 'Beta',
  email: 'auth-b-' + run + '@example.com',
  password,
  passwordConfirmation: password,
};
const browserErrors = [];
const contexts = [];
let phase = 'startup';
let browser;
let apiClient;

function observe(page) {
  page.on('pageerror', (error) => browserErrors.push(phase + ': ' + error.message));
  page.on('console', (event) => {
    if (event.type() === 'error' && /MISSING_MESSAGE|hydration|Hydration/.test(event.text()))
      browserErrors.push(phase + ': ' + event.text());
  });
}
async function context(options = {}) {
  const value = await browser.newContext({ viewport: { width: 1365, height: 900 }, ...options });
  if (process.env.AUTH_SMOKE_DISABLE_WEB_LOCKS === '1') {
    await value.addInitScript(() =>
      Object.defineProperty(navigator, 'locks', { value: undefined }),
    );
  }
  contexts.push(value);
  value.on('page', observe);
  return value;
}
async function navigate(page, route) {
  await page.goto(base + route);
}
async function login(page, account, returnTo = '/users') {
  await navigate(page, '/login?returnTo=' + encodeURIComponent(returnTo));
  await page.getByLabel('Email', { exact: false }).fill(account.email);
  await page.getByLabel('Password', { exact: false }).fill(account.password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.waitForURL((url) => url.pathname === new URL(returnTo, base).pathname);
}
async function cookieOf(ctx) {
  const cookie = (await ctx.cookies()).find((value) => value.name === 'dzencode_auth');
  assert.ok(cookie, 'Authentication cookie must exist.');
  return cookie;
}
async function me(cookie) {
  return await apiClient.get(api + '/auth/me', {
    headers: { Authorization: 'Bearer ' + cookie.value },
  });
}
async function signedOut(page) {
  await page.waitForURL((url) => url.pathname === '/login', { timeout: 15000 });
  await page.getByRole('heading', { name: 'Sign in', exact: true }).waitFor();
}

(async () => {
  try {
    await fs.mkdir(artifacts, { recursive: true });
    browser = await chromium.launch({
      channel: process.env.AUTH_SMOKE_BROWSER_CHANNEL ?? 'msedge',
      headless: true,
    });
    apiClient = await request.newContext();
    const ctx = await context();
    const page = await ctx.newPage();
    phase = 'guest routes';
    for (const route of [
      '/orders',
      '/orders/new',
      '/products',
      '/products/new',
      '/users',
      '/groups',
      '/settings',
    ]) {
      const response = await ctx.request.get(base + route, { maxRedirects: 0 });
      assert.ok([303, 307, 308].includes(response.status()), 'Guest redirect: ' + route);
      assert.equal(new URL(response.headers().location, base).pathname, '/login');
    }
    assert.equal((await apiClient.get(api + '/orders')).status(), 401);
    assert.equal((await ctx.request.get(base + '/health')).status(), 200);
    phase = 'localized public shell';
    await navigate(page, '/register?returnTo=%2Fusers');
    await page.getByRole('heading', { name: 'Create account', exact: true }).waitFor();
    assert.equal(await page.locator('nav').count(), 0);
    await page.getByRole('button', { name: 'RU', exact: true }).click();
    await page.getByRole('heading', { name: 'Создать аккаунт', exact: true }).waitFor();
    await page.getByRole('button', { name: 'EN', exact: true }).click();
    await page.getByRole('heading', { name: 'Create account', exact: true }).waitFor();
    phase = 'registration and HttpOnly cookie';
    await page.getByLabel('First name', { exact: false }).fill(accountA.firstName);
    await page.getByLabel('Last name', { exact: false }).fill(accountA.lastName);
    await page.getByLabel('Email', { exact: false }).fill(accountA.email);
    await page.getByLabel('Password', { exact: false }).first().fill(password);
    await page.getByLabel('Confirm password', { exact: false }).fill(password);
    assert.equal(
      await page.evaluate(() =>
        Object.values(localStorage).some((value) => value.includes('browser test password')),
      ),
      false,
    );
    await page.getByRole('button', { name: 'Create account', exact: true }).click();
    await page.waitForURL((url) => url.pathname === '/users');
    await page.getByText(accountA.email, { exact: true }).waitFor();
    const cookieA = await cookieOf(ctx);
    assert.equal(cookieA.httpOnly, true);
    assert.equal(cookieA.sameSite, 'Lax');
    assert.equal(cookieA.secure, false);
    assert.equal(cookieA.path, '/');
    assert.ok(cookieA.expires > Date.now() / 1000);
    assert.equal(await page.evaluate(() => document.cookie.includes('dzencode_auth')), false);
    const tokenPayload = JSON.parse(
      Buffer.from(cookieA.value.split('.')[1], 'base64url').toString('utf8'),
    );
    assert.equal(tokenPayload.exp, undefined);
    const identity = await (await me(cookieA)).json();
    const userAId = identity.user.id;
    await page.locator('.sessions-counter--online').waitFor();
    assert.match(await page.locator('.sessions-counter__value').innerText(), /^[1-9]\d*$/);
    phase = 'warm cache and guest denial';
    await navigate(page, '/orders');
    await page.getByRole('heading', { name: 'Orders', exact: false }).first().waitFor();
    await page.reload();
    const guest = await context();
    await guest.addCookies([
      { name: 'dzencode_auth', value: 'tampered-jwt', url: base, httpOnly: true, sameSite: 'Lax' },
    ]);
    const guestPage = await guest.newPage();
    for (const route of ['/orders', '/products', '/users', '/groups', '/settings', '/orders/new']) {
      await navigate(guestPage, route);
      await signedOut(guestPage);
    }
    await guest.close();
    phase = 'user-owned drafts and shared inventory';
    await page.evaluate(() =>
      localStorage.setItem(
        'inventory:draft:v1:order',
        JSON.stringify({
          version: 1,
          updatedAt: Date.now(),
          revision: 'legacy',
          values: { title: 'anonymous draft must not be adopted', description: '', date: '' },
        }),
      ),
    );
    await navigate(page, '/orders/new');
    await page.getByLabel('Title', { exact: false }).waitFor();
    assert.equal(await page.getByLabel('Title', { exact: false }).inputValue(), '');
    const orderTitle = 'Auth shared order ' + run;
    await page.getByLabel('Title', { exact: false }).fill(orderTitle);
    await page.getByRole('button', { name: 'Create order', exact: true }).click();
    await page.waitForURL((url) => url.pathname === '/orders' && url.searchParams.has('order'));
    const createdOrder = new URL(page.url()).searchParams.get('order');
    await page.locator('.order-panel__title').filter({ hasText: orderTitle }).waitFor();
    await navigate(page, '/orders/new');
    await page.getByLabel('Title', { exact: false }).fill('private draft user A');
    await page.reload();
    assert.equal(
      await page.getByLabel('Title', { exact: false }).inputValue(),
      'private draft user A',
    );
    assert.ok(
      await page.evaluate(
        (id) => localStorage.getItem('inventory:draft:v1:user:' + id + ':order'),
        userAId,
      ),
    );
    const tab = await ctx.newPage();
    await navigate(tab, '/products');
    await tab.getByRole('heading', { name: 'Products', exact: false }).first().waitFor();
    const device = await context();
    const devicePage = await device.newPage();
    await login(devicePage, accountA);
    const deviceCookie = await cookieOf(device);
    assert.notEqual(deviceCookie.value, cookieA.value);
    phase = 'logout revocation and cross-tab lifecycle';
    await page.getByRole('button', { name: 'Sign out', exact: true }).click();
    await Promise.all([signedOut(page), signedOut(tab)]);
    assert.equal((await me(cookieA)).status(), 401);
    assert.equal((await me(deviceCookie)).status(), 200);
    await devicePage.reload();
    await devicePage.getByText(accountA.email, { exact: true }).waitFor();
    phase = 'account B isolation';
    const createdB = await apiClient.post(api + '/auth/register', { data: accountB });
    assert.equal(createdB.status(), 201);
    await login(page, accountB, '/orders/new');
    assert.equal(await page.getByLabel('Title', { exact: false }).inputValue(), '');
    await page.getByLabel('Title', { exact: false }).fill('private draft user B');
    await navigate(page, '/orders?order=' + createdOrder);
    await page.locator('.order-panel__title').filter({ hasText: orderTitle }).waitFor();
    await navigate(page, '/users');
    await page.getByText(accountB.email, { exact: true }).waitFor();
    assert.equal(await page.getByText(accountA.email, { exact: true }).count(), 0);
    await page.screenshot({ path: path.join(artifacts, 'users-en.png'), fullPage: true });
    phase = 'mobile layout';
    await page.setViewportSize({ width: 375, height: 812 });
    await page.locator('.nav-menu').waitFor({ state: 'hidden' });
    assert.ok(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      'Mobile horizontal overflow',
    );
    await page.screenshot({ path: path.join(artifacts, 'users-mobile.png'), fullPage: true });
    await page.setViewportSize({ width: 1365, height: 900 });
    phase = 'owner draft recovery';
    await page.getByRole('button', { name: 'Sign out', exact: true }).click();
    await signedOut(page);
    await login(page, accountA, '/orders/new');
    assert.equal(
      await page.getByLabel('Title', { exact: false }).inputValue(),
      'private draft user A',
    );
    phase = 'login completion after SPA form unmount';
    const abandoned = await context();
    const abandonedPage = await abandoned.newPage();
    await navigate(abandonedPage, '/login?returnTo=%2Fusers');
    await abandonedPage.getByLabel('Email', { exact: false }).fill(accountA.email);
    await abandonedPage.getByLabel('Password', { exact: false }).fill(password);
    let releaseLogin;
    let loginReady;
    const delayedLogin = new Promise((resolve) => {
      releaseLogin = resolve;
    });
    const loginProcessed = new Promise((resolve) => {
      loginReady = resolve;
    });
    await abandonedPage.route('**/*', async (route) => {
      const original = route.request();
      if (
        original.method() !== 'POST' ||
        !original.headers()['next-action'] ||
        original.postData() === '[]'
      )
        return await route.continue();
      const response = await apiClient.fetch(original.url(), {
        method: original.method(),
        headers: await original.allHeaders(),
        data: original.postDataBuffer(),
      });
      loginReady();
      await delayedLogin;
      await route.fulfill({ response });
    });
    try {
      await abandonedPage.getByRole('button', { name: 'Sign in', exact: true }).click();
      await loginProcessed;
      await abandonedPage.getByRole('link', { name: 'Create an account', exact: true }).click();
      await abandonedPage.getByRole('heading', { name: 'Create account', exact: true }).waitFor();
      releaseLogin();
      await abandonedPage.getByText(accountA.email, { exact: true }).waitFor();
      assert.equal(new URL(abandonedPage.url()).pathname, '/users');
    } finally {
      releaseLogin();
    }
    phase = 'delayed logout cookie versus another-tab login';
    const race = await context();
    // Exercise the cookie guarantee even when cross-tab notifications are unavailable.
    await race.addInitScript(() => {
      window.BroadcastChannel = undefined;
      const setItem = Storage.prototype.setItem;
      Storage.prototype.setItem = function (key, value) {
        if (key !== 'inventory:auth:change') setItem.call(this, key, value);
      };
    });
    const older = await race.newPage();
    await login(older, accountA);
    const newer = await race.newPage();
    await navigate(newer, '/users');
    let releaseResponse;
    let responseReady;
    const held = new Promise((resolve) => {
      releaseResponse = resolve;
    });
    const ready = new Promise((resolve) => {
      responseReady = resolve;
    });
    await older.route('**/*', async (route) => {
      const original = route.request();
      if (original.method() !== 'POST' || !original.headers()['next-action'])
        return await route.continue();
      // A separate request context prevents Set-Cookie being applied before the delayed browser response.
      const response = await apiClient.fetch(original.url(), {
        method: original.method(),
        headers: await original.allHeaders(),
        data: original.postDataBuffer(),
      });
      responseReady();
      await held;
      await route.fulfill({ response });
    });
    try {
      await older.getByRole('button', { name: 'Sign out', exact: true }).click();
      await ready;
      await navigate(newer, '/login?returnTo=%2Fusers');
      await newer.getByLabel('Email', { exact: false }).fill(accountB.email);
      await newer.getByLabel('Password', { exact: false }).fill(password);
      const detectPrematureRequest = async () => {
        try {
          await newer.waitForRequest(
            (value) => value.method() === 'POST' && !!value.headers()['next-action'],
            { timeout: 750 },
          );
          return true;
        } catch {
          return false;
        }
      };
      const premature = detectPrematureRequest();
      await newer.getByRole('button', { name: 'Sign in', exact: true }).click();
      assert.equal(
        await premature,
        false,
        'Another tab must wait until the old cookie response has been applied.',
      );
      releaseResponse();
      await newer.waitForURL((url) => url.pathname === '/users');
      await newer.getByText(accountB.email, { exact: true }).waitFor();
      const finalIdentity = await (await me(await cookieOf(race))).json();
      assert.equal(finalIdentity.user.email, accountB.email);
    } finally {
      releaseResponse();
    }
    assert.equal(browserErrors.length, 0, browserErrors.join('\n'));
    console.info(
      'Auth browser smoke passed: localized shells, registration, HttpOnly persistence, warm-cache denial, shared inventory, user-owned drafts, cross-tab logout, distinct-device session and mobile layout.',
    );
  } catch (error) {
    console.error('Auth browser smoke failed during ' + phase + ': ' + error.message);
    if (browser) {
      const active = contexts.flatMap((ctx) => ctx.pages()).find((page) => !page.isClosed());
      if (active)
        await active.screenshot({ path: path.join(artifacts, 'failure.png'), fullPage: true });
    }
    process.exitCode = 1;
  } finally {
    for (const ctx of contexts) await ctx.close();
    await apiClient?.dispose();
    await browser?.close();
  }
})();
