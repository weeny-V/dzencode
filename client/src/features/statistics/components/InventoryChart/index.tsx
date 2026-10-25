'use client';

import './InventoryChart.scss';

import { DEFAULT_LOCALE, type Locale } from '@/shared/i18n/config';
import { Button } from '@/shared/ui/Button';

import { useInventoryChart } from './useInventoryChart';

interface ChartProps {
  labels: string[];
  values: number[];
  unit: string;
  locale?: Locale;
  messages: { loading: string; error: string; retry: string };
}

export function InventoryChart({
  labels,
  values,
  unit,
  messages,
  locale = DEFAULT_LOCALE,
}: ChartProps) {
  const state = useInventoryChart(labels, values, unit, locale);
  return <InventoryChartView {...state} messages={messages} />;
}

function InventoryChartView({
  container,
  canvas,
  status,
  retry,
  messages,
}: ReturnType<typeof useInventoryChart> & Pick<ChartProps, 'messages'>) {
  return (
    <div ref={container} className="inventory-chart">
      {status === 'loading' && <p role="status">{messages.loading}</p>}
      {status === 'error' && (
        <div role="alert">
          <p>{messages.error}</p>
          <Button variant="ghost" type="button" onClick={retry}>
            {messages.retry}
          </Button>
        </div>
      )}
      <div className="inventory-chart__canvas" hidden={status === 'error'}>
        <canvas ref={canvas} aria-hidden="true" />
      </div>
    </div>
  );
}
