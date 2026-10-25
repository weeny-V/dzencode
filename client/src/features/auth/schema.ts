import { z } from 'zod';

const password = z
  .string()
  .min(1, 'required')
  .refine((value) => new TextEncoder().encode(value).length <= 1024, 'passwordLength');
export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(254, 'email')
    .refine((value) => {
      if (
        !/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/.test(
          value,
        )
      )
        return false;
      const local = value.slice(0, value.indexOf('@'));
      return (
        local.length <= 64 &&
        !local.startsWith('.') &&
        !local.endsWith('.') &&
        !local.includes('..')
      );
    }, 'email'),
  password,
});
export const loginFormSchema = loginSchema.extend({
  firstName: z.string(),
  lastName: z.string(),
  passwordConfirmation: z.string(),
});
export const registrationSchema = loginSchema
  .extend({
    firstName: z
      .string()
      .trim()
      .min(1, 'required')
      .refine((value) => Array.from(value).length <= 100, 'nameLength'),
    lastName: z
      .string()
      .trim()
      .min(1, 'required')
      .refine((value) => Array.from(value).length <= 100, 'nameLength'),
    password: password.refine((value) => Array.from(value).length >= 12, 'passwordLength'),
    passwordConfirmation: z.string(),
  })
  .refine((value) => value.password === value.passwordConfirmation, {
    path: ['passwordConfirmation'],
    message: 'confirmation',
  });
export type LoginValues = z.infer<typeof loginSchema>;
export type RegistrationValues = z.infer<typeof registrationSchema>;
export type AuthValues = RegistrationValues;
export const emptyAuthValues: AuthValues = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  passwordConfirmation: '',
};
