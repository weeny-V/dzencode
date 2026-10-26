import { randomUUID } from 'node:crypto';

import { type APIRequestContext, expect, type Page, test as base } from '@playwright/test';

import { apiURL, baseURL } from './settings';

export interface Account {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  passwordConfirmation: string;
  token: string;
}

interface Order {
  id: number;
  title: string;
}
interface Product {
  id: number;
  title: string;
}
export interface Warehouse {
  id: number;
  name: string;
  address: string;
}

export function newAccount() {
  return {
    firstName: 'Browser',
    lastName: 'Verification',
    email: `e2e-${randomUUID()}@example.com`,
    password: 'Disposable browser password 123',
    passwordConfirmation: 'Disposable browser password 123',
  };
}

export class Inventory {
  private readonly orders = new Set<number>();
  readonly prefix = `E2E ${randomUUID()}`;
  constructor(
    private readonly request: APIRequestContext,
    private readonly token: string,
  ) {}

  async json<T>(method: 'GET' | 'POST' | 'DELETE', route: string, data?: unknown): Promise<T> {
    const response = await this.request.fetch(apiURL + route, {
      method,
      data,
      headers: { Authorization: `Bearer ${this.token}` },
    });
    expect(response.ok(), `${method} ${route}: ${response.status()}`).toBe(true);
    return response.status() === 204 ? (undefined as T) : ((await response.json()) as T);
  }

  trackOrder(id: number) {
    this.orders.add(id);
  }

  async order(suffix = 'order', warehouseId?: number) {
    const order = await this.json<Order>('POST', '/orders', {
      title: `${this.prefix} ${suffix}`,
      warehouseId,
    });
    this.trackOrder(order.id);
    return order;
  }

  product(order: number, suffix = 'product', type = 'Monitors') {
    return this.json<Product>('POST', '/products', {
      title: `${this.prefix} ${suffix}`,
      serialNumber: 123456,
      isNew: true,
      type,
      order,
      guarantee: { start: '2026-01-01', end: '2027-01-01' },
      price: [
        { value: 1234.5, symbol: 'UAH', isDefault: true },
        { value: 30, symbol: 'USD', isDefault: false },
      ],
    });
  }

  async cleanup() {
    for (const id of this.orders) {
      const response = await this.request.delete(`${apiURL}/orders/${id}`, {
        headers: { Authorization: `Bearer ${this.token}` },
      });
      expect([204, 404]).toContain(response.status());
    }
  }
}

export async function settledAt(page: Page, pathname: string) {
  // Auth starts both a hard navigation and a tab synchronization reload.
  await expect.poll(() => new URL(page.url()).pathname).toBe(pathname);
  await page.waitForLoadState('load');
}

export async function login(page: Page, account: Account, returnTo = '/orders') {
  await page.goto(`/login?returnTo=${encodeURIComponent(returnTo)}`);
  const submit = page.getByRole('button', { name: 'Sign in', exact: true });
  await expect(submit).toBeEnabled();
  await page.getByLabel('Email', { exact: false }).fill(account.email);
  await page
    .getByLabel('Password', { exact: false })
    .and(page.locator('input[name="password"]'))
    .fill(account.password);
  await submit.click();
  await settledAt(page, new URL(returnTo, baseURL).pathname);
  await expect(page.locator('.sessions-counter--online')).toBeVisible();
}

export async function authenticatedCookie(page: Page) {
  const cookie = (await page.context().cookies()).find((value) => value.name === 'dzencode_auth');
  expect(cookie).toBeDefined();
  return cookie!;
}

export const test = base.extend<
  {
    inventory: Inventory;
    signedIn: void;
    browserChecks: void;
  },
  { account: Account }
>({
  account: [
    async ({ playwright }, use) => {
      if (!/^dzencode-tests-\d+$/.test(process.env.E2E_MANAGED_STACK ?? '')) {
        throw new Error(
          'Use npm run test:e2e: these tests write only to the managed disposable stack.',
        );
      }
      const request = await playwright.request.newContext();
      try {
        const account = newAccount();
        const response = await request.post(`${apiURL}/auth/register`, { data: account });
        expect(response.status()).toBe(201);
        const { token } = (await response.json()) as { token: string };
        await use({ ...account, token });
      } finally {
        await request.dispose();
      }
    },
    { scope: 'worker' },
  ],
  inventory: async ({ request, account }, use) => {
    const inventory = new Inventory(request, account.token);
    try {
      await use(inventory);
    } finally {
      await inventory.cleanup();
    }
  },
  signedIn: async ({ page, account }, use) => {
    await login(page, account);
    await use();
  },
  browserChecks: [
    async ({ context, account: _account }, use) => {
      const errors: string[] = [];
      const allowed = [new URL(baseURL).origin, new URL(apiURL).origin];
      await context.route('**/*', async (route) => {
        const url = new URL(route.request().url());
        if (url.hostname === 'tiles.inventory.test') {
          await route.fulfill({
            contentType: 'image/png',
            body: Buffer.from(
              'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aONsAAAAASUVORK5CYII=',
              'base64',
            ),
          });
        } else if (allowed.includes(url.origin)) await route.continue();
        else {
          errors.push(`Unexpected external request: ${url.origin}`);
          await route.abort();
        }
      });
      context.on('page', (page) => {
        page.on('pageerror', (error) => errors.push(error.message));
        page.on('console', (event) => {
          if (event.type() === 'error' && /hydration|MISSING_MESSAGE/i.test(event.text())) {
            errors.push(event.text());
          }
        });
      });
      await use();
      expect(errors, 'Uncaught browser, hydration and external-network errors').toEqual([]);
    },
    { auto: true },
  ],
});

export { expect } from '@playwright/test';
