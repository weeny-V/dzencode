import { describe, expect, it } from 'vitest';

import { loginSchema, registrationSchema } from './schema';

const registration = {
  firstName: 'Test',
  lastName: 'User',
  password: 'test password 123',
  passwordConfirmation: 'test password 123',
};
describe('authentication validation contract', () => {
  it.each([
    'a!b@example.com',
    'a+b@example.com',
    'a%b@example.com',
    'a&b@example.com',
    "a'b@example.com",
    'a_b@example.com',
    'A.B@EXAMPLE.COM',
  ])('accepts the mailbox syntax supported by REST: %s', (email) => {
    expect(loginSchema.parse({ email, password: 'x' }).email).toBe(email.toLowerCase());
    expect(registrationSchema.parse({ ...registration, email }).email).toBe(email.toLowerCase());
  });
  it.each([
    'a..b@example.com',
    '.a@example.com',
    'a.@example.com',
    'a@-example.com',
    'a@localhost',
    'ä@example.com',
  ])('rejects malformed or unsupported mailboxes: %s', (email) => {
    expect(loginSchema.safeParse({ email, password: 'x' }).success).toBe(false);
  });
});
