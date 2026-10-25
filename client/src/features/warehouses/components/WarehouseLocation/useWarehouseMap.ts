'use client';
import { useEffect, useRef, useState } from 'react';

import type { Warehouse } from '@/shared/api/types';
import { useAuthSession } from '@/shared/hooks/useAuthSession';

import { loadMapRuntime } from '../../api/mapLoader';

export function useWarehouseMap(warehouse: Warehouse | null, zoomIn: string, zoomOut: string) {
  const session = useAuthSession();
  const element = useRef<HTMLDivElement>(null);
  const [requested, setRequested] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  useEffect(() => {
    if (!requested || !warehouse || !element.current || !session.isCurrent()) return;
    const target = element.current;
    let active = true;
    let dispose: (() => void) | undefined;
    const fail = () => {
      if (!active) return;
      active = false;
      clearTimeout(deadline);
      dispose?.();
      dispose = undefined;
      if (session.isCurrent()) setStatus('error');
    };
    const deadline = setTimeout(fail, 12_000);
    const run = async () => {
      try {
        const runtime = await loadMapRuntime();
        if (!active || !session.isCurrent()) return;
        dispose = runtime.mountWarehouseMap(
          target,
          warehouse,
          () => {
            if (!active || !session.isCurrent()) return;
            clearTimeout(deadline);
            setStatus('ready');
          },
          fail,
          { zoomIn, zoomOut },
        );
        // A runtime may report a synchronous setup/tile failure before returning its cleanup.
        if (!active) {
          dispose();
          dispose = undefined;
        }
      } catch {
        fail();
      }
    };
    void run();
    return () => {
      active = false;
      clearTimeout(deadline);
      dispose?.();
    };
  }, [requested, warehouse, attempt, session, zoomIn, zoomOut]);
  const show = () => {
    if (!session.isCurrent()) return;
    setStatus('loading');
    setRequested(true);
    setAttempt((value) => value + 1);
  };
  return { element, requested, status, show, hide: () => setRequested(false) };
}
