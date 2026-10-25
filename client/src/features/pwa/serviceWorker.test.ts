import { readFileSync } from 'node:fs';
import path from 'node:path';
import { runInNewContext } from 'node:vm';

import { beforeEach, describe, expect, it, vi } from 'vitest';

// The worker is a plain script (client/public/sw.js). It is run here against fakes of the worker scope.
const source = readFileSync(path.resolve(__dirname, '../../../public/sw.js'), 'utf8');
const ORIGIN = 'https://inventory.example';

type Handler = (event: unknown) => void;

class FakeCache {
  entries = new Map<string, Response>();
  match = (request: Request | string) =>
    Promise.resolve(
      this.entries.get(typeof request === 'string' ? absolute(request) : request.url),
    );
  put = (request: Request, response: Response) => {
    this.entries.set(request.url, response);
    return Promise.resolve();
  };
  addAll = (urls: string[]) => {
    for (const url of urls) this.entries.set(absolute(url), new Response(`precached ${url}`));
    return Promise.resolve();
  };
  keys = () => Promise.resolve([...this.entries.keys()].map((url) => new Request(url)));
  delete = (request: Request) => Promise.resolve(this.entries.delete(request.url));
}
const absolute = (url: string) => (url.startsWith('http') ? url : ORIGIN + url);

function load() {
  const handlers = new Map<string, Handler>();
  const stores = new Map<string, FakeCache>();
  const caches = {
    open: (name: string) => {
      if (!stores.has(name)) stores.set(name, new FakeCache());
      return Promise.resolve(stores.get(name)!);
    },
    keys: () => Promise.resolve([...stores.keys()]),
    delete: (name: string) => Promise.resolve(stores.delete(name)),
    match: async (url: string) => {
      for (const store of stores.values()) {
        const found = await store.match(url);
        if (found) return found;
      }
      return undefined;
    },
  };
  const fetchMock = vi.fn<(request: Request) => Promise<Response>>();
  const scope = {
    location: { origin: ORIGIN },
    addEventListener: (type: string, handler: Handler) => handlers.set(type, handler),
  };
  runInNewContext(source, { self: scope, caches, fetch: fetchMock, Response, URL });
  const dispatch = async (type: string, extra: Record<string, unknown> = {}) => {
    const pending: Promise<unknown>[] = [];
    let responded: Promise<Response> | undefined;
    handlers.get(type)?.({
      ...extra,
      waitUntil: (promise: Promise<unknown>) => pending.push(promise),
      respondWith: (promise: Promise<Response>) => (responded = promise),
    });
    await Promise.all(pending);
    return { responded: responded && (await responded), intercepted: responded !== undefined };
  };
  const request = (url: string, init: RequestInit & { mode?: RequestMode } = {}) => {
    const { mode, ...rest } = init;
    const created = new Request(absolute(url), rest);
    // `mode: 'navigate'` cannot be set on a constructed Request.
    return mode === 'navigate'
      ? Object.defineProperty(created, 'mode', { value: 'navigate' })
      : created;
  };
  return { stores, fetchMock, dispatch, request };
}

let worker: ReturnType<typeof load>;
beforeEach(() => {
  worker = load();
});
const ok = (body = 'x') => new Response(body, { status: 200 });

describe('service worker lifecycle', () => {
  it('precaches only the offline page and the icons', async () => {
    await worker.dispatch('install');
    expect([...worker.stores.get('inventory-static-v1')!.entries.keys()].sort()).toEqual(
      [
        `${ORIGIN}/offline.html`,
        `${ORIGIN}/icons/icon-192.png`,
        `${ORIGIN}/icons/icon-512.png`,
      ].sort(),
    );
  });
  it('removes the caches of earlier versions and leaves foreign ones alone', async () => {
    worker.stores.set('inventory-static-v0', new FakeCache());
    worker.stores.set('inventory-static-v1', new FakeCache());
    worker.stores.set('someone-elses', new FakeCache());
    await worker.dispatch('activate');
    expect([...worker.stores.keys()].sort()).toEqual(['inventory-static-v1', 'someone-elses']);
  });
});

describe('navigations', () => {
  it('pass through to the network and are never stored', async () => {
    worker.fetchMock.mockResolvedValue(ok('<html>private orders</html>'));
    const { responded } = await worker.dispatch('fetch', {
      request: worker.request('/orders?order=1', { mode: 'navigate' }),
    });
    expect(await responded?.text()).toContain('private orders');
    expect(worker.stores.size).toBe(0);
  });
  it('fall back to the offline page when the network is down', async () => {
    await worker.dispatch('install');
    worker.fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    const { responded } = await worker.dispatch('fetch', {
      request: worker.request('/groups', { mode: 'navigate' }),
    });
    expect(await responded?.text()).toBe('precached /offline.html');
  });
  it('fail like the browser does when even the offline page is missing', async () => {
    worker.fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    const { responded } = await worker.dispatch('fetch', {
      request: worker.request('/groups', { mode: 'navigate' }),
    });
    expect(responded?.type).toBe('error');
  });
});

describe('offline page icons', () => {
  it('are served from the device when they were precached', async () => {
    await worker.dispatch('install');
    const { responded } = await worker.dispatch('fetch', {
      request: worker.request('/icons/icon-192.png'),
    });
    expect(await responded?.text()).toBe('precached /icons/icon-192.png');
    expect(worker.fetchMock).not.toHaveBeenCalled();
  });
  it('come from the network when the device has none', async () => {
    worker.fetchMock.mockResolvedValue(ok('from network'));
    const { responded } = await worker.dispatch('fetch', {
      request: worker.request('/icons/icon-192.png'),
    });
    expect(await responded?.text()).toBe('from network');
  });
});

describe('static files', () => {
  const file = (name: string) => worker.request(`/_next/static/chunks/${name}.js`);
  it('are fetched once and then served from the device', async () => {
    worker.fetchMock.mockImplementation(() =>
      Promise.resolve(Object.defineProperty(ok('chunk'), 'type', { value: 'basic' })),
    );
    const first = await worker.dispatch('fetch', { request: file('a') });
    expect(await first.responded?.text()).toBe('chunk');
    const second = await worker.dispatch('fetch', { request: file('a') });
    expect(await second.responded?.text()).toBe('chunk');
    expect(worker.fetchMock).toHaveBeenCalledOnce();
  });
  it('are not kept when the answer failed or is not a plain same-origin response', async () => {
    worker.fetchMock.mockResolvedValueOnce(new Response('nope', { status: 404 }));
    await worker.dispatch('fetch', { request: file('missing') });
    worker.fetchMock.mockResolvedValueOnce(ok('opaque-ish'));
    await worker.dispatch('fetch', { request: file('cors') });
    expect(worker.stores.get('inventory-static-v1')?.entries.size ?? 0).toBe(0);
  });
  it('are trimmed to the newest 150, never touching the precached ones', async () => {
    await worker.dispatch('install');
    worker.fetchMock.mockImplementation(() =>
      Promise.resolve(Object.defineProperty(ok('chunk'), 'type', { value: 'basic' })),
    );
    for (let index = 0; index < 160; index += 1)
      await worker.dispatch('fetch', { request: file(String(index)) });
    const keys = [...worker.stores.get('inventory-static-v1')!.entries.keys()];
    expect(keys.filter((key) => key.includes('/_next/static/'))).toHaveLength(150);
    expect(keys).toContain(`${ORIGIN}/offline.html`);
    expect(keys).not.toContain(`${ORIGIN}/_next/static/chunks/0.js`);
    expect(keys).toContain(`${ORIGIN}/_next/static/chunks/159.js`);
  });
});

describe('everything else is left to the browser', () => {
  it.each([
    ['a write', () => worker.request('/orders', { method: 'POST', body: '{}' })],
    ['a page data (RSC) fetch', () => worker.request('/orders?_rsc=abc')],
    ['the GraphQL API', () => worker.request('/graphql?query=%7B__typename%7D')],
    ['the REST API on another origin', () => new Request('https://api.example/orders')],
    ['an image of the build', () => worker.request('/_next/image?url=%2Fa.png')],
    [
      'the entry script of a Web Worker (its parameters live in the URL fragment)',
      () =>
        Object.defineProperty(
          worker.request('/_next/static/chunks/turbopack-worker-1.js'),
          'destination',
          {
            value: 'worker',
          },
        ),
    ],
    ['a socket polling request', () => worker.request('/socket.io/?EIO=4&transport=polling')],
  ])('does not intercept %s', async (_name, build) => {
    const { intercepted } = await worker.dispatch('fetch', { request: build() });
    expect(intercepted).toBe(false);
    expect(worker.fetchMock).not.toHaveBeenCalled();
  });
});
