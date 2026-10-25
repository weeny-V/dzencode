'use client';

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

import type { NewProduct } from '@/shared/api/types';
import { useMountedRef } from '@/shared/hooks/useMountedRef';
import { actionResult } from '@/shared/lib/actionResult';
import { toQuery } from '@/shared/lib/searchParams';

import { createProduct } from '../../actions';

/** Options arrive from the server; this hook only submits and navigates while the form is mounted. */
export function useNewProduct() {
  const router = useRouter();
  const mounted = useMountedRef();
  return useCallback(
    async (product: NewProduct): Promise<string | undefined> => {
      const response = await actionResult(() => createProduct(product));
      if (!response.ok) return response.error;
      const result = response.data;
      if (!result.ok) return result.error;
      if (mounted.current) router.push(`/orders${toQuery({ order: String(result.data.order) })}`);
      return undefined;
    },
    [router, mounted],
  );
}
