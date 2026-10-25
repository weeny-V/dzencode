import { createStatisticsService } from './statistics.service.js';

export const createStatisticsModule = (deps: Parameters<typeof createStatisticsService>[0]) => ({
  service: createStatisticsService(deps),
});

export {
  DEFAULT_GRAPH_ORDER_LIMIT,
  MAX_GRAPH_ORDER_LIMIT,
  parseGraphOrderLimit,
} from './statistics.schemas.js';
export type { StatisticsService } from './statistics.service.js';
export type {
  InventoryGraph,
  InventoryGraphEdge,
  InventoryGraphNode,
  InventoryStatistics,
} from './statistics.types.js';
