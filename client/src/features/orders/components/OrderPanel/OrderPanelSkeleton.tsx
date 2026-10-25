import './OrderPanel.scss';

import Link from 'next/link';

import { CloseIcon } from '@/shared/ui/icons';
import { ListSkeleton } from '@/shared/ui/Skeleton';

export function OrderPanelSkeleton({ closeHref }: { closeHref: string }) {
  return (
    <section className="order-panel" aria-label="Приход">
      <Link href={closeHref} className="order-panel__close" aria-label="Закрыть панель">
        <CloseIcon />
      </Link>
      <header className="order-panel__header">
        <h2 className="order-panel__title">Приход</h2>
      </header>
      <div className="order-panel__state">
        <ListSkeleton rows={3} rowHeight="4rem" label="Загрузка продуктов…" />
      </div>
    </section>
  );
}
