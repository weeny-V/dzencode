import { asObject, bad, type Body, requiredString } from '../../shared/validation.js';

const parseEmail = (body: Body): string => {
  const email = requiredString(body, 'email', 254).toLowerCase();
  // Deliberately bounded ASCII mailbox syntax; no provider-specific dot/plus rewriting.
  if (
    !/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/.test(
      email,
    )
  ) {
    return bad('email must be a valid email address');
  }
  const local = email.slice(0, email.indexOf('@'));
  if (local.length > 64 || local.startsWith('.') || local.endsWith('.') || local.includes('..')) {
    return bad('email must be a valid email address');
  }
  return email;
};

const parsePassword = (body: Body): string => {
  const password = body.password;
  if (typeof password !== 'string' || password.length === 0 || Buffer.byteLength(password) > 1024) {
    return bad('password must contain between 1 and 1024 bytes');
  }
  return password;
};

export const parseLogin = (value: unknown) => {
  const body = asObject(value, 'body');
  return { email: parseEmail(body), password: parsePassword(body) };
};

export const parseRegistration = (value: unknown) => {
  const body = asObject(value, 'body');
  const input = parseLogin(body);
  if (Array.from(input.password).length < 12)
    return bad('password must contain at least 12 characters');
  if (body.passwordConfirmation !== input.password) return bad('password confirmation must match');
  return {
    ...input,
    firstName: requiredString(body, 'firstName', 100),
    lastName: requiredString(body, 'lastName', 100),
  };
};

export type LoginInput = ReturnType<typeof parseLogin>;
export type RegistrationInput = ReturnType<typeof parseRegistration>;
