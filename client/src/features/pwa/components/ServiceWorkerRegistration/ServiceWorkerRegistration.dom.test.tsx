import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ServiceWorkerRegistration } from './index';

const mocks = vi.hoisted(() => ({ env: { serviceWorkerEnabled: true } }));
vi.mock('@/shared/config/env', () => ({ env: mocks.env }));

const register = vi.fn();
beforeEach(() => {
  mocks.env.serviceWorkerEnabled = true;
  register.mockReset().mockResolvedValue({});
  Object.defineProperty(navigator, 'serviceWorker', {
    value: { register },
    configurable: true,
  });
  Object.defineProperty(window, 'isSecureContext', { value: true, configurable: true });
});
afterEach(() => {
  Reflect.deleteProperty(navigator, 'serviceWorker');
  vi.restoreAllMocks();
});

describe('service worker registration', () => {
  it('registers the worker at the site root once the page is loaded', () => {
    render(<ServiceWorkerRegistration />);
    expect(register).toHaveBeenCalledWith('/sw.js', { scope: '/' });
  });
  it('waits for the load event while the page is still loading', () => {
    vi.spyOn(document, 'readyState', 'get').mockReturnValue('loading');
    const view = render(<ServiceWorkerRegistration />);
    expect(register).not.toHaveBeenCalled();
    window.dispatchEvent(new Event('load'));
    expect(register).toHaveBeenCalledOnce();
    view.unmount();
  });
  it('does not register outside a production build', () => {
    mocks.env.serviceWorkerEnabled = false;
    render(<ServiceWorkerRegistration />);
    expect(register).not.toHaveBeenCalled();
  });
  it('does not register in an insecure context', () => {
    Object.defineProperty(window, 'isSecureContext', { value: false, configurable: true });
    render(<ServiceWorkerRegistration />);
    expect(register).not.toHaveBeenCalled();
  });
  it('does nothing in a browser without service workers', () => {
    Reflect.deleteProperty(navigator, 'serviceWorker');
    expect(() => render(<ServiceWorkerRegistration />)).not.toThrow();
  });
  it('swallows a failed registration', async () => {
    register.mockRejectedValue(new Error('denied'));
    render(<ServiceWorkerRegistration />);
    await Promise.resolve();
    expect(register).toHaveBeenCalledOnce();
  });
});
