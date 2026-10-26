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
    { password: '', message: 'required' },
    { password: 'short', message: 'passwordTooShort' },
    { password: '🔒'.repeat(11), message: 'passwordTooShort' },
    { password: 'a'.repeat(1025), message: 'passwordTooLong' },
    { password: '🔒'.repeat(257), message: 'passwordTooLong' },
  ])('reports the specific password problem: $message', ({ password, message }) => {
    const result = registrationSchema.safeParse({
      ...registration,
      email: 'test@example.com',
      password,
      passwordConfirmation: password,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.find((issue) => issue.path[0] === 'password')?.message).toBe(
        message,
      );
    }
  });
  it.each([
    { name: 'minimum ASCII', password: 'a'.repeat(12) },
    { name: 'minimum Unicode', password: '🔒'.repeat(12) },
    { name: 'maximum ASCII', password: 'a'.repeat(1024) },
    { name: 'maximum Unicode', password: '🔒'.repeat(256) },
  ])('keeps the $name password length boundary', ({ password }) => {
    expect(
      registrationSchema.safeParse({
        ...registration,
        email: 'test@example.com',
        password,
        passwordConfirmation: password,
      }).success,
    ).toBe(true);
  });
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
