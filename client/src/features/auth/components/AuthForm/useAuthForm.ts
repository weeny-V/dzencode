'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { useMountedRef } from '@/shared/hooks/useMountedRef';
import { actionResult } from '@/shared/lib/actionResult';
import { announceAuthChange, authGeneration } from '@/shared/lib/authLifecycle';
import { navigateAfterAuth, reloadAfterAuth } from '@/shared/lib/authNavigation';

import { submitCredentials } from '../../actions';
import { serializeAuthMutation } from '../../api/coordination';
import {
  type AuthValues,
  emptyAuthValues,
  loginFormSchema,
  registrationSchema,
} from '../../schema';

export function useAuthForm(mode: 'login' | 'register', returnTo: string) {
  const mounted = useMountedRef();
  const [error, setError] = useState<string>();
  const form = useForm<AuthValues>({
    resolver: zodResolver(mode === 'register' ? registrationSchema : loginFormSchema),
    defaultValues: emptyAuthValues,
    mode: 'onTouched',
  });
  const submit = form.handleSubmit(async (values) => {
    const generation = authGeneration();
    setError(undefined);
    const result = await actionResult(() =>
      serializeAuthMutation(async () => {
        if (!mounted.current || generation !== authGeneration())
          throw new Error('Authentication changed');
        const response = await submitCredentials(mode, values, returnTo);
        if (response.ok) {
          const current = mounted.current && generation === authGeneration();
          if (current) form.reset(emptyAuthValues);
          announceAuthChange();
          if (current) navigateAfterAuth(response.data.returnTo);
          else reloadAfterAuth();
        }
        return response;
      }),
    );
    if (!mounted.current || generation !== authGeneration()) return;
    form.resetField('password');
    form.resetField('passwordConfirmation');
    if (!result.ok) {
      setError('unavailable');
      return;
    }
    if (!result.data.ok) {
      setError(result.data.error);
      return;
    }
  });
  return { form, error, submit };
}
