import cytoscape from 'cytoscape';

import type { InventoryGraphEdge, InventoryGraphNode } from '@/shared/api/types';

import { columnPositions } from './graphLayout';

export interface GraphController {
  zoomBy: (factor: number) => void;
  fit: () => void;
  dispose: () => void;
}

const MAX_EDGE_WIDTH = 7;
const MAX_NODE_WIDTH = 220;
const NODE_PADDING = 28;
const CHARACTER_WIDTH = 7.5;

// `width: 'label'` is deprecated in Cytoscape 3.34 and left most nodes invisible, so the width comes from the text.
const nodeWidth = (label: string) =>
  Math.min(MAX_NODE_WIDTH, NODE_PADDING + label.length * CHARACTER_WIDTH);

/** Mounts a pannable graph with fixed column positions; labels arrive already localized. */
export const mountInventoryGraph = (
  container: HTMLElement,
  nodes: InventoryGraphNode[],
  edges: InventoryGraphEdge[],
): GraphController => {
  const styles = getComputedStyle(container);
  const color = (name: string) => styles.getPropertyValue(name).trim();
  const positions = columnPositions(nodes);
  const cy = cytoscape({
    container,
    elements: [
      ...nodes.map((node) => ({
        group: 'nodes' as const,
        data: {
          id: node.id,
          label: node.label ?? '',
          kind: node.kind,
          width: nodeWidth(node.label ?? ''),
        },
        position: positions.get(node.id) ?? { x: 0, y: 0 },
      })),
      ...edges.map((edge) => ({
        group: 'edges' as const,
        data: {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          width: Math.min(MAX_EDGE_WIDTH, 1 + edge.productsCount),
        },
      })),
    ],
    layout: { name: 'preset', fit: true, padding: 16 },
    // The page keeps the wheel: zooming is done with the buttons, panning by dragging the background.
    userZoomingEnabled: false,
    boxSelectionEnabled: false,
    autoungrabify: true,
    minZoom: 0.15,
    maxZoom: 2,
    style: [
      {
        selector: 'node',
        style: {
          label: 'data(label)',
          shape: 'round-rectangle',
          width: 'data(width)',
          height: 32,
          color: color('--graph-node-text'),
          'font-size': 13,
          'text-valign': 'center',
          'text-halign': 'center',
          'text-max-width': (node: cytoscape.NodeSingular) =>
            `${(node.data('width') as number) - 12}px`,
          'text-wrap': 'ellipsis',
          'background-color': color('--graph-order'),
        },
      },
      {
        selector: 'node[kind = "WAREHOUSE"]',
        style: { 'background-color': color('--graph-warehouse') },
      },
      {
        selector: 'node[kind = "PRODUCT_TYPE"]',
        style: { 'background-color': color('--graph-type') },
      },
      {
        selector: 'edge',
        style: {
          width: 'data(width)',
          'line-color': color('--graph-edge'),
          'curve-style': 'bezier',
          opacity: 0.8,
        },
      },
      { selector: '.faded', style: { opacity: 0.15 } },
    ],
  });
  cy.on('tap', (event: cytoscape.EventObject) => {
    cy.elements().removeClass('faded');
    const target = event.target as cytoscape.Core | cytoscape.NodeSingular;
    if (target === cy) return;
    cy.elements()
      .not((target as cytoscape.NodeSingular).closedNeighborhood())
      .addClass('faded');
  });
  // Exposes what is actually drawn, so a style regression that hides nodes is caught by the browser smoke.
  const report = () => {
    container.dataset.nodes = String(cy.nodes().length);
    container.dataset.visibleNodes = String(cy.nodes().filter((node) => node.visible()).length);
  };
  report();
  // Cytoscape does not notice container size changes (rotation, narrow/wide layouts): refit on resize.
  const observer =
    typeof ResizeObserver === 'undefined'
      ? undefined
      : new ResizeObserver(() => {
          cy.resize();
          cy.fit(undefined, 16);
          report();
        });
  observer?.observe(container);
  return {
    zoomBy: (factor) =>
      cy.zoom({
        level: cy.zoom() * factor,
        renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 },
      }),
    fit: () => cy.fit(undefined, 16),
    dispose: () => {
      observer?.disconnect();
      cy.destroy();
    },
  };
};
