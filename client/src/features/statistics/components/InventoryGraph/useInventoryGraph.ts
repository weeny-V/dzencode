'use client';

import { useCallback, useRef } from 'react';

import type { InventoryGraphEdge, InventoryGraphNode } from '@/shared/api/types';

import { useDeferredRuntime } from '../../hooks/useDeferredRuntime';
import { loadGraphRuntime } from './graphLoader';
import type { GraphController } from './graphRuntime';

type GraphRuntime = Awaited<ReturnType<typeof loadGraphRuntime>>;

export function useInventoryGraph(nodes: InventoryGraphNode[], edges: InventoryGraphEdge[]) {
  const container = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLDivElement>(null);
  const controller = useRef<GraphController | undefined>(undefined);
  const mount = useCallback(
    (runtime: GraphRuntime) => {
      if (!canvas.current) throw new Error('The graph container is not mounted');
      const mounted = runtime.mountInventoryGraph(canvas.current, nodes, edges);
      controller.current = mounted;
      return () => {
        controller.current = undefined;
        mounted.dispose();
      };
    },
    [nodes, edges],
  );
  const { status, retry } = useDeferredRuntime(container, loadGraphRuntime, mount);
  return {
    container,
    canvas,
    status,
    retry,
    zoomIn: () => controller.current?.zoomBy(1.25),
    zoomOut: () => controller.current?.zoomBy(0.8),
    fit: () => controller.current?.fit(),
  };
}
