import './OrderPanel.scss';

import Link from 'next/link';

import { CloseIcon } from '@/shared/ui/icons';
import { ListSkeleton } from '@/shared/ui/Skeleton';

import { text } from './messages.server';

export async function OrderPanelSkeleton({ closeHref }: { closeHref: string }) {
  const t = await text();
  return (
    <section className="order-panel" aria-label={t('title')}>
      <Link href={closeHref} className="order-panel__close" aria-label={t('close')}>
        <CloseIcon />
      </Link>
      <header className="order-panel__header">
        <h2 className="order-panel__title">{t('title')}</h2>
      </header>
      <div className="order-panel__state">
        <ListSkeleton rows={3} rowHeight="4rem" label={t('loading')} />
      </div>
    </section>
  );
}
