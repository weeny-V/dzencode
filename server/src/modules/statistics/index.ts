import { createStatisticsRouter } from './statistics.routes.js';
import { createStatisticsService } from './statistics.service.js';

export const createStatisticsModule = (deps: Parameters<typeof createStatisticsService>[0]) => {
  const service = createStatisticsService(deps);
  return { service, router: createStatisticsRouter(service) };
};

export type { StatisticsService } from './statistics.service.js';
export type { InventoryStatistics } from './statistics.types.js';
