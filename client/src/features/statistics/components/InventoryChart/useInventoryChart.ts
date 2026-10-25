'use client';

import { useEffect, useRef, useState } from 'react';

import { useAuthSession } from '@/shared/hooks/useAuthSession';
import { DEFAULT_LOCALE, type Locale } from '@/shared/i18n/config';

import { loadChartRuntime } from './chartLoader';

export function useInventoryChart(
  labels: string[],
  values: number[],
  unit: string,
  locale: Locale = DEFAULT_LOCALE,
) {
  const session = useAuthSession();
  const container = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!container.current || !canvas.current) return;
    const target = canvas.current;
    let active = true;
    let started = false;
    let dispose: (() => void) | undefined;
    let deadline: ReturnType<typeof setTimeout> | undefined;
    const fail = () => {
      if (active) {
        active = false;
        dispose?.();
        if (session.isCurrent()) setStatus('error');
      }
    };
    const run = async () => {
      if (started || !session.isCurrent()) return;
      started = true;
      deadline = setTimeout(fail, 12_000);
      try {
        const runtime = await loadChartRuntime();
        if (!active || !session.isCurrent()) return;
        dispose = runtime.mountBarChart(target, labels, values, unit, locale);
        clearTimeout(deadline);
        setStatus('ready');
      } catch {
        clearTimeout(deadline);
        fail();
      }
    };
    const observer =
      typeof IntersectionObserver === 'undefined'
        ? undefined
        : new IntersectionObserver((entries) => {
            if (entries.some((entry) => entry.isIntersecting)) {
              observer?.disconnect();
              void run();
            }
          });
    if (observer) observer.observe(container.current);
    else void run();
    return () => {
      active = false;
      clearTimeout(deadline);
      observer?.disconnect();
      dispose?.();
    };
  }, [labels, values, unit, locale, attempt, session]);
  return {
    container,
    canvas,
    status,
    retry: () => {
      if (!session.isCurrent()) return;
      setStatus('loading');
      setAttempt((value) => value + 1);
    },
  };
}
