'use client';

import dynamic from 'next/dynamic';
import type { ComponentProps } from 'react';

// The form and its validation library (react-hook-form, zod) load in their own chunk. The server still renders the
// form into the page; only the pages that list products no longer download its code.
const NewProductContainer = dynamic(async () => (await import('.')).NewProductContainer);

export function NewProductLoader(props: ComponentProps<typeof NewProductContainer>) {
  return <NewProductContainer {...props} />;
}
