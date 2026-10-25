'use client';

import { useCallback, useRef } from 'react';

import { DEFAULT_LOCALE, type Locale } from '@/shared/i18n/config';

import { useDeferredRuntime } from '../../hooks/useDeferredRuntime';
import { loadChartRuntime } from './chartLoader';

type ChartRuntime = Awaited<ReturnType<typeof loadChartRuntime>>;

export function useInventoryChart(
  labels: string[],
  values: number[],
  unit: string,
  locale: Locale = DEFAULT_LOCALE,
) {
  const container = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const mount = useCallback(
    (runtime: ChartRuntime) => {
      if (!canvas.current) throw new Error('The chart canvas is not mounted');
      return runtime.mountBarChart(canvas.current, labels, values, unit, locale);
    },
    [labels, values, unit, locale],
  );
  const { status, retry } = useDeferredRuntime(container, loadChartRuntime, mount);
  return { container, canvas, status, retry };
}
