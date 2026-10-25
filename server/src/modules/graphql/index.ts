import type { StatisticsService } from '../statistics/index.js';
import { createGraphqlHandler } from './graphql.routes.js';

export const createGraphqlModule = ({ statistics }: { statistics: StatisticsService }) => ({
  handler: createGraphqlHandler(statistics),
});
