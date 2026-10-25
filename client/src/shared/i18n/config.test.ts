import { describe, expect, it } from 'vitest';

import { resolveLocale } from './config';
describe('locale selection', () => {
  it('defaults to English without browser language detection', () => {
    expect(resolveLocale(undefined)).toBe('en');
    expect(resolveLocale('fr')).toBe('en');
    expect(resolveLocale('../ru')).toBe('en');
  });
  it('accepts only the supported cookie values', () => {
    expect(resolveLocale('ru')).toBe('ru');
    expect(resolveLocale('en')).toBe('en');
  });
});
