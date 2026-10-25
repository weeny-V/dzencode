import { describe, expect, it, vi } from 'vitest';

import { getDictionary } from './server';
const state = vi.hoisted(() => ({ locale: 'en' }));
vi.mock('next-intl/server', () => ({ getLocale: () => Promise.resolve(state.locale) }));
describe('component dictionaries', () => {
  it('loads only the current language and isolates consecutive requests', async () => {
    const load = vi.fn((locale: 'en' | 'ru') => Promise.resolve({ default: { title: locale } }));
    state.locale = 'en';
    expect((await getDictionary(load)).messages.title).toBe('en');
    expect(load).toHaveBeenCalledTimes(1);
    expect(load).toHaveBeenLastCalledWith('en');
    state.locale = 'ru';
    expect((await getDictionary(load)).messages.title).toBe('ru');
    expect(load).toHaveBeenCalledTimes(2);
    expect(load).toHaveBeenLastCalledWith('ru');
  });
});
