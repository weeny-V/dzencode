import type { Metadata } from 'next';

import type { Text } from './server';
export async function pageMetadata(text: () => Promise<Text>): Promise<Metadata> {
  const t = await text();
  return { title: t('title'), description: t('description') };
}
