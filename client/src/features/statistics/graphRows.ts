import type { InventoryGraph } from '@/shared/api/types';

export interface ConnectionRow {
  orderId: string;
  order: string;
  warehouse: string;
  productsCount: number;
  types: { type: string; productsCount: number }[];
}

/** The exact, textual form of the graph: one row per shown order with its warehouse and product types. */
export const connectionRows = (graph: InventoryGraph, unassigned: string): ConnectionRow[] => {
  const label = new Map(graph.nodes.map((node) => [node.id, node.label ?? unassigned]));
  const warehouseOf = new Map<string, string>();
  const typesOf = new Map<string, ConnectionRow['types']>();
  for (const edge of graph.edges) {
    if (edge.source.startsWith('warehouse:'))
      warehouseOf.set(edge.target, label.get(edge.source) ?? unassigned);
    else
      typesOf.set(edge.source, [
        ...(typesOf.get(edge.source) ?? []),
        { type: label.get(edge.target) ?? edge.target, productsCount: edge.productsCount },
      ]);
  }
  return graph.nodes
    .filter((node) => node.kind === 'ORDER')
    .map((node) => ({
      orderId: node.id,
      order: node.label ?? node.id,
      warehouse: warehouseOf.get(node.id) ?? unassigned,
      productsCount: node.productsCount,
      types: typesOf.get(node.id) ?? [],
    }));
};
