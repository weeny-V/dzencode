import { describe, expect, it } from 'vitest';

import { createSessionsService } from './sessions.service.js';

describe('SessionsService', () => {
  it('counts the open sessions', () => {
    const service = createSessionsService();

    expect(service.count()).toBe(0);
    expect(service.open('a')).toBe(1);
    expect(service.open('b')).toBe(2);
    expect(service.close('a')).toBe(1);
    expect(service.count()).toBe(1);
  });

  it('counts a session once even if it is opened twice', () => {
    const service = createSessionsService();

    service.open('a');

    expect(service.open('a')).toBe(1);
  });

  it('ignores closing a session that is not open', () => {
    const service = createSessionsService();
    service.open('a');

    expect(service.close('unknown')).toBe(1);
    expect(service.close('a')).toBe(0);
    expect(service.close('a')).toBe(0);
  });

  it('keeps every instance separate', () => {
    const first = createSessionsService();
    const second = createSessionsService();

    first.open('a');

    expect(second.count()).toBe(0);
  });
});
