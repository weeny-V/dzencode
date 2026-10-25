'use client';

import './WarehouseLocation.scss';

import type { Warehouse } from '@/shared/api/types';
import { Button } from '@/shared/ui/Button';

import type { WarehouseMessages } from './messages';
import { useWarehouseMap } from './useWarehouseMap';

/** Address fallback stays useful independently of the optional map provider. */
export function WarehouseLocation({
  warehouse,
  messages,
}: {
  warehouse: Warehouse | null;
  messages: WarehouseMessages;
}) {
  const state = useWarehouseMap(warehouse, messages.zoomIn, messages.zoomOut);
  return <WarehouseLocationView warehouse={warehouse} messages={messages} {...state} />;
}

function WarehouseLocationView({
  warehouse,
  messages,
  element,
  requested,
  status,
  show,
  hide,
}: {
  warehouse: Warehouse | null;
  messages: WarehouseMessages;
} & ReturnType<typeof useWarehouseMap>) {
  return (
    <section className="warehouse-location" aria-label={messages.title}>
      {!warehouse ? (
        <p>{messages.unassigned}</p>
      ) : (
        <>
          <h3 className="warehouse-location__name">{warehouse.name}</h3>
          <p>{warehouse.address}</p>
          <Button
            variant="ghost"
            type="button"
            onClick={requested ? hide : show}
            aria-expanded={requested}
          >
            {requested ? messages.hide : messages.show}
          </Button>
          {requested && (
            <>
              {status === 'loading' && <p role="status">{messages.loading}</p>}
              {status === 'error' && (
                <div role="alert">
                  <p>{messages.error}</p>
                  <Button variant="ghost" type="button" onClick={show}>
                    {messages.retry}
                  </Button>
                </div>
              )}
              <div
                ref={element}
                className={`warehouse-location__map${status === 'error' ? ' warehouse-location__map--failed' : ''}`}
                role="region"
                aria-label={messages.mapLabel}
              />
            </>
          )}
        </>
      )}
    </section>
  );
}
