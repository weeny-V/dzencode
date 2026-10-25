import type { InventoryGraphNode, InventoryGraphNodeKind } from '@/shared/api/types';

export const COLUMN_GAP = 340;
export const ROW_GAP = 46;

const COLUMN: Record<InventoryGraphNodeKind, number> = { WAREHOUSE: 0, ORDER: 1, PRODUCT_TYPE: 2 };

/** Three columns (warehouses, orders, product types), each centered on the same horizontal axis. */
export const columnPositions = (
  nodes: Pick<InventoryGraphNode, 'id' | 'kind'>[],
): Map<string, { x: number; y: number }> => {
  const seen = new Map<InventoryGraphNodeKind, number>();
  const sizes = new Map<InventoryGraphNodeKind, number>();
  for (const node of nodes) sizes.set(node.kind, (sizes.get(node.kind) ?? 0) + 1);
  const positions = new Map<string, { x: number; y: number }>();
  for (const node of nodes) {
    const row = seen.get(node.kind) ?? 0;
    seen.set(node.kind, row + 1);
    positions.set(node.id, {
      x: COLUMN[node.kind] * COLUMN_GAP,
      y: (row - ((sizes.get(node.kind) ?? 1) - 1) / 2) * ROW_GAP,
    });
  }
  return positions;
};
