import { describe, expect, it } from 'vitest';

import { RateLimitError } from '../../shared/errors.js';
import { createAuthThrottle } from './auth.throttle.js';

describe('auth throttling', () => {
  it('limits attempts per operation/address and permits a new window', () => {
    let now = 0;
    const throttle = createAuthThrottle(() => now);
    for (let n = 0; n < 20; n += 1) throttle.check('login', 'a');
    expect(() => throttle.check('login', 'a')).toThrow(RateLimitError);
    expect(() => throttle.check('login', 'b')).not.toThrow();
    for (let n = 0; n < 10; n += 1) throttle.check('register', 'a');
    expect(() => throttle.check('register', 'a')).toThrow(RateLimitError);
    now = 15 * 60 * 1000;
    expect(() => throttle.check('login', 'a')).not.toThrow();
  });
});
