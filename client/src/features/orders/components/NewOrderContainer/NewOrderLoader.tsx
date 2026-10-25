'use client';

import dynamic from 'next/dynamic';
import type { ComponentProps } from 'react';

// The form and its validation library (react-hook-form, zod) load in their own chunk. The server still renders the
// form into the page; only the pages that list orders no longer download its code.
const NewOrderContainer = dynamic(async () => (await import('.')).NewOrderContainer);

export function NewOrderLoader(props: ComponentProps<typeof NewOrderContainer>) {
  return <NewOrderContainer {...props} />;
}
