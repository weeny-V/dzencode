'use client';

import dynamic from 'next/dynamic';
import type { ComponentProps } from 'react';

// The form and its validation library (react-hook-form, zod) load in their own chunk. The server still renders the
// form into the page; only the pages behind the sign-in no longer download its code.
const AuthForm = dynamic(async () => (await import('.')).AuthForm);

export function AuthFormLoader(props: ComponentProps<typeof AuthForm>) {
  return <AuthForm {...props} />;
}
