'use client';

import './InventoryGraph.scss';

import type { InventoryGraphEdge, InventoryGraphNode } from '@/shared/api/types';
import { Button } from '@/shared/ui/Button';

import { useInventoryGraph } from './useInventoryGraph';

interface GraphProps {
  nodes: InventoryGraphNode[];
  edges: InventoryGraphEdge[];
  messages: {
    loading: string;
    error: string;
    retry: string;
    zoomIn: string;
    zoomOut: string;
    fit: string;
    controls: string;
    hint: string;
  };
}

export function InventoryGraph({ nodes, edges, messages }: GraphProps) {
  const state = useInventoryGraph(nodes, edges);
  return <InventoryGraphView {...state} messages={messages} />;
}

function InventoryGraphView({
  container,
  canvas,
  status,
  retry,
  zoomIn,
  zoomOut,
  fit,
  messages,
}: ReturnType<typeof useInventoryGraph> & Pick<GraphProps, 'messages'>) {
  return (
    <div ref={container} className="inventory-graph">
      {status === 'loading' && <p role="status">{messages.loading}</p>}
      {status === 'error' && (
        <div role="alert">
          <p>{messages.error}</p>
          <Button variant="ghost" type="button" onClick={retry}>
            {messages.retry}
          </Button>
        </div>
      )}
      <div
        className="inventory-graph__toolbar"
        role="group"
        aria-label={messages.controls}
        hidden={status !== 'ready'}
      >
        <Button variant="ghost" type="button" onClick={zoomIn}>
          {messages.zoomIn}
        </Button>
        <Button variant="ghost" type="button" onClick={zoomOut}>
          {messages.zoomOut}
        </Button>
        <Button variant="ghost" type="button" onClick={fit}>
          {messages.fit}
        </Button>
      </div>
      <div
        ref={canvas}
        className="inventory-graph__canvas"
        aria-hidden="true"
        hidden={status === 'error'}
      />
      <p className="inventory-graph__hint" hidden={status !== 'ready'}>
        {messages.hint}
      </p>
    </div>
  );
}
