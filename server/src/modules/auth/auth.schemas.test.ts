import { describe, expect, it } from 'vitest';

import { ValidationError } from '../../shared/errors.js';
import { TEST_REGISTRATION } from '../../shared/testing/auth.js';
import { parseLogin, parseRegistration } from './auth.schemas.js';

describe('auth input', () => {
  it('normalizes email and names without trimming a password', () => {
    expect(
      parseRegistration({
        ...TEST_REGISTRATION,
        email: ' Test@EXAMPLE.com ',
        firstName: ' Test ',
        password: ' password 123 ',
        passwordConfirmation: ' password 123 ',
      }),
    ).toEqual({
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      password: ' password 123 ',
    });
  });
  it.each([
    null,
    [],
    {},
    { ...TEST_REGISTRATION, firstName: '' },
    { ...TEST_REGISTRATION, lastName: 'x'.repeat(101) },
    { ...TEST_REGISTRATION, passwordConfirmation: 'different' },
    { ...TEST_REGISTRATION, password: 'short', passwordConfirmation: 'short' },
    { ...TEST_REGISTRATION, password: '😀'.repeat(300), passwordConfirmation: '😀'.repeat(300) },
  ])('rejects invalid registration input: %j', (value) => {
    expect(() => parseRegistration(value)).toThrow(ValidationError);
  });
  it.each([
    'not-email',
    'a@',
    'a@@example.com',
    'a@localhost',
    'a..b@example.com',
    '.a@example.com',
    'a.@example.com',
    'a@-example.com',
    'a@ex ample.com',
    'ä@example.com',
    `${'a'.repeat(65)}@example.com`,
  ])('rejects malformed email %s', (email) => {
    expect(() => parseLogin({ email, password: 'x' })).toThrow(ValidationError);
  });
  it('lets short login passwords reach generic credential verification', () => {
    expect(parseLogin({ email: 'a@example.com', password: 'x' }).password).toBe('x');
  });
});
