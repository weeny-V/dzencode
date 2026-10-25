import './OrdersContent.scss';

import { type ReactNode, Suspense, ViewTransition } from 'react';

import { loadOrError } from '@/shared/api/server';
import type { OrderSummary } from '@/shared/api/types';
import type { ActionResult } from '@/shared/lib/actionResult';
import { toQuery } from '@/shared/lib/searchParams';
import { LoadError } from '@/shared/ui/LoadError';
import { NoResults } from '@/shared/ui/NoResults';
import { PageHeader } from '@/shared/ui/PageHeader';

import { getOrder, getOrders } from '../../api/orders';
import { OrderItem } from '../OrderItem';
import { OrderPanel } from '../OrderPanel/OrderPanel.server';
import { OrderPanelSkeleton } from '../OrderPanel/OrderPanelSkeleton';
import { PanelScroll } from '../PanelScroll';

export async function OrdersContent({ selectedId, query }: { selectedId?: number; query: string }) {
  // Begin the panel read alongside the list. Its independent boundary never blocks the list.
  const details = selectedId === undefined ? undefined : loadOrError(() => getOrder(selectedId));
  const result = await loadOrError(() => getOrders(query));
  const panel =
    selectedId === undefined ? undefined : (
      <OrderPanel id={selectedId} details={details} closeHref={`/orders${toQuery({ q: query })}`} />
    );
  return <OrdersContentView result={result} selectedId={selectedId} query={query} panel={panel} />;
}

function OrdersContentView({
  result,
  selectedId,
  query,
  panel,
}: {
  result: ActionResult<OrderSummary[]>;
  selectedId?: number;
  query: string;
  panel?: ReactNode;
}) {
  return (
    <>
      <PageHeader
        title="Приходы"
        count={result.ok ? result.data.length : undefined}
        add={{ label: 'Добавить приход', href: '/orders/new' }}
      />
      <div className={`orders-page${selectedId === undefined ? '' : ' orders-page--with-panel'}`}>
        <div data-pending-target>
          {!result.ok ? (
            <LoadError title="Не удалось загрузить приходы." message={result.error} />
          ) : result.data.length === 0 ? (
            query ? (
              <NoResults
                query={query}
                clearHref={`/orders${toQuery({ order: selectedId === undefined ? undefined : String(selectedId) })}`}
              />
            ) : (
              <p className="orders-page__empty">Приходов пока нет.</p>
            )
          ) : (
            <ul className="orders-page__list">
              {result.data.map((order, index) => (
                <ViewTransition
                  key={order.id}
                  name={`order-${order.id}`}
                  enter="none"
                  exit="auto"
                  share="row-move"
                  update="row-move"
                >
                  <OrderItem
                    order={order}
                    index={index}
                    href={`/orders${toQuery({ order: String(order.id), q: query })}`}
                    selected={order.id === selectedId}
                    compact={selectedId !== undefined}
                  />
                </ViewTransition>
              ))}
            </ul>
          )}
        </div>
        {selectedId !== undefined && (
          <ViewTransition key={selectedId} enter="panel-enter" exit="panel-exit" default="none">
            <PanelScroll className="orders-page__panel" orderId={selectedId}>
              <Suspense
                key={selectedId}
                fallback={<OrderPanelSkeleton closeHref={`/orders${toQuery({ q: query })}`} />}
              >
                {panel}
              </Suspense>
            </PanelScroll>
          </ViewTransition>
        )}
      </div>
    </>
  );
}
