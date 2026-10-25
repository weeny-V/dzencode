import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { env } from '@/shared/config/env';
import { deferred } from '@/testing/fixtures';

import { ApiError } from './errors';
import { deleteRequest, postJson, request } from './http';
import { getJson, loadOrError } from './server';

const nextCache = vi.hoisted(() => ({ unstable_cache: vi.fn() }));
vi.mock('next/cache', () => nextCache);
beforeEach(() => {
  nextCache.unstable_cache.mockClear();
  nextCache.unstable_cache.mockImplementation((read: () => Promise<unknown>) => read);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('server REST boundary', () => {
  it('uses the private URL and caches JSON with tags and TTL', async () => {
    vi.stubEnv('API_URL', 'http://server:4000');
    const fetchMock = vi.fn().mockResolvedValue(Response.json([{ id: 7 }]));
    vi.stubGlobal('fetch', fetchMock);
    expect(await getJson('/orders?q=monitor', { tags: ['orders'] })).toEqual([{ id: 7 }]);
    expect(fetchMock).toHaveBeenCalledWith('http://server:4000/orders?q=monitor', {
      cache: 'no-store',
      signal: expect.any(AbortSignal) as AbortSignal,
    });
    expect(nextCache.unstable_cache).toHaveBeenCalledWith(expect.any(Function), expect.any(Array), {
      tags: ['orders'],
      revalidate: 60,
    });
  });

  it('allows an explicit TTL', async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json([]));
    vi.stubGlobal('fetch', fetchMock);
    await getJson('/products', { tags: ['products'], revalidate: 15 });
    expect(fetchMock).toHaveBeenCalledWith(expect.any(String), {
      cache: 'no-store',
      signal: expect.any(AbortSignal) as AbortSignal,
    });
    expect(nextCache.unstable_cache).toHaveBeenCalledWith(expect.any(Function), expect.any(Array), {
      tags: ['products'],
      revalidate: 15,
    });
  });

  it('bypasses the Data Cache for revalidate zero', async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json([]));
    vi.stubGlobal('fetch', fetchMock);
    expect(await getJson('/orders', { tags: ['orders'], revalidate: 0 })).toEqual([]);
    expect(nextCache.unstable_cache).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('separates cached reads for different private API origins', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(Response.json([]))),
    );
    vi.stubEnv('API_URL', 'http://first:4000');
    await getJson('/orders', { tags: ['orders'] });
    vi.stubEnv('API_URL', 'http://second:4000');
    await getJson('/orders', { tags: ['orders'] });
    const calls = nextCache.unstable_cache.mock.calls as [unknown, string[], unknown][];
    expect(calls).toHaveLength(2);
    expect(calls[0]?.[1]).not.toEqual(calls[1]?.[1]);
  });

  it('falls back to the public URL for local server calls', () => {
    vi.stubEnv('API_URL', undefined);
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'http://127.0.0.1:4010');
    expect(env.serverApiUrl).toBe('http://127.0.0.1:4010');
  });

  it('bounds inventory reads with a server-side timeout signal', async () => {
    const controller = new AbortController();
    const error = new DOMException('API read timed out', 'TimeoutError');
    const timeout = vi.spyOn(AbortSignal, 'timeout').mockReturnValue(controller.signal);
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, init: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            init.signal?.addEventListener('abort', () => reject(error), {
              once: true,
            });
          }),
      ),
    );
    const read = loadOrError(() => getJson('/orders', { tags: ['orders'] }));
    controller.abort(error);
    expect(await read).toEqual({ ok: false, error: 'API read timed out' });
    expect(timeout).toHaveBeenCalledWith(10_000);
  });

  it('keeps independent signals for separate server read invocations', async () => {
    const signals: AbortSignal[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn((_url: string, init: RequestInit) => {
        signals.push(init.signal as AbortSignal);
        return Promise.resolve(Response.json([]));
      }),
    );
    await Promise.all([
      getJson('/orders?q=a', { tags: ['orders'] }),
      getJson('/orders?q=ab', { tags: ['orders'] }),
    ]);
    expect(signals).toHaveLength(2);
    expect(signals[0]).not.toBe(signals[1]);
    expect(signals.every((signal) => !signal.aborted)).toBe(true);
  });

  it('cancels an in-flight read through the caller controller', async () => {
    const controller = new AbortController();
    const fetchMock = vi.fn(
      (_url: string, init: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener(
            'abort',
            () => reject(new DOMException('Cancelled', 'AbortError')),
            { once: true },
          );
        }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const read = getJson('/orders', { tags: ['orders'], signal: controller.signal });
    controller.abort();
    await expect(read).rejects.toMatchObject({ name: 'AbortError' });
    expect(nextCache.unstable_cache).not.toHaveBeenCalled();
    const init = fetchMock.mock.calls[0]?.[1];
    expect(init?.signal).not.toBe(controller.signal);
    expect(init?.signal?.aborted).toBe(true);
  });

  it('retains the read timeout when a caller signal is supplied', async () => {
    const controller = new AbortController();
    const timeout = new AbortController();
    const error = new DOMException('Timed out', 'TimeoutError');
    vi.spyOn(AbortSignal, 'timeout').mockReturnValue(timeout.signal);
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, init: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            init.signal?.addEventListener('abort', () => reject(error), { once: true });
          }),
      ),
    );
    const read = getJson('/orders', { tags: ['orders'], signal: controller.signal });
    timeout.abort(error);
    await expect(read).rejects.toBe(error);
    expect(controller.signal.aborted).toBe(false);
  });

  it('rejects an already cancelled read before consulting fetch or its cache', async () => {
    const controller = new AbortController();
    controller.abort();
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await expect(
      getJson('/orders', { tags: ['orders'], signal: controller.signal }),
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does not cancel another caller reading the same URL', async () => {
    const firstController = new AbortController();
    const secondController = new AbortController();
    const secondResponse = deferred<Response>();
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockImplementationOnce(
          (_url: string, init: RequestInit) =>
            new Promise<Response>((_resolve, reject) => {
              init.signal?.addEventListener(
                'abort',
                () => reject(new DOMException('Cancelled', 'AbortError')),
                { once: true },
              );
            }),
        )
        .mockReturnValueOnce(secondResponse.promise),
    );
    const firstRead = getJson('/orders', { tags: ['orders'], signal: firstController.signal });
    const secondRead = getJson('/orders', { tags: ['orders'], signal: secondController.signal });
    firstController.abort();
    await expect(firstRead).rejects.toMatchObject({ name: 'AbortError' });
    secondResponse.resolve(Response.json([{ id: 7 }]));
    expect(await secondRead).toEqual([{ id: 7 }]);
    expect(secondController.signal.aborted).toBe(false);
  });

  it('discards a response body completed after its caller cancelled', async () => {
    const controller = new AbortController();
    const body = deferred<unknown>();
    const response = Response.json({});
    const json = vi.spyOn(response, 'json').mockReturnValue(body.promise);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));
    const read = request('/orders', { signal: controller.signal });
    await vi.waitFor(() => expect(json).toHaveBeenCalledOnce());
    controller.abort();
    body.resolve([{ id: 7 }]);
    await expect(read).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('forwards caller signals to POST and DELETE without adding the read timeout', async () => {
    const postController = new AbortController();
    const deleteController = new AbortController();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ id: 7 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    const timeout = vi.spyOn(AbortSignal, 'timeout');
    vi.stubGlobal('fetch', fetchMock);
    await postJson('/orders', { title: 'New' }, postController.signal);
    await deleteRequest('/orders/7', deleteController.signal);
    const calls = fetchMock.mock.calls as [string, RequestInit][];
    expect(calls[0]?.[1].signal).toBe(postController.signal);
    expect(calls[1]?.[1].signal).toBe(deleteController.signal);
    expect(timeout).not.toHaveBeenCalled();
  });

  it('posts JSON and deletes without caching or parsing a 204 body', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ id: 7 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);
    expect(await postJson('/orders', { title: 'New' })).toEqual({ id: 7 });
    expect(await deleteRequest('/orders/7')).toBeUndefined();
    expect(fetchMock.mock.calls[0]?.[1]).toEqual({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"title":"New"}',
      cache: 'no-store',
    });
    expect(fetchMock.mock.calls[1]?.[1]).toEqual({ method: 'DELETE', cache: 'no-store' });
  });

  it('preserves API status and validation errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(Response.json({ error: 'Title is required' }, { status: 400 })),
    );
    await expect(request('/orders')).rejects.toMatchObject({
      status: 400,
      message: 'Title is required',
    });
  });

  it('falls back to status text for proxy errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response('<h1>Bad gateway</h1>', { status: 502, statusText: 'Bad Gateway' }),
        ),
    );
    await expect(request('/orders')).rejects.toThrow('502 Bad Gateway');
  });

  it('turns read failures into serializable results, including 404', async () => {
    expect(await loadOrError(() => Promise.resolve(7))).toEqual({ ok: true, data: 7 });
    expect(await loadOrError(() => Promise.reject(new ApiError(404, 'Order not found')))).toEqual({
      ok: false,
      error: 'Order not found',
    });
    expect(await loadOrError(vi.fn().mockRejectedValue('offline'))).toEqual({
      ok: false,
      error: 'Request failed',
    });
  });
});
