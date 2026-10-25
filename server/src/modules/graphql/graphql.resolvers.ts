import { GraphQLError } from 'graphql';

import { ValidationError } from '../../shared/errors.js';
import { parseGraphOrderLimit, type StatisticsService } from '../statistics/index.js';

/** The single place where domain errors become GraphQL errors (REST has shared/http/errorHandler.ts). */
const toGraphQLError = (error: unknown) =>
  error instanceof ValidationError
    ? new GraphQLError(error.message, {
        extensions: { code: 'BAD_USER_INPUT', http: { status: 400 } },
      })
    : error;

const guarded = async <T>(work: () => Promise<T>): Promise<T> => {
  try {
    return await work();
  } catch (error) {
    throw toGraphQLError(error);
  }
};

export const createResolvers = (statistics: StatisticsService) => ({
  Query: {
    inventoryStatistics: (_root: unknown, { currency }: { currency: 'UAH' | 'USD' }) =>
      guarded(() => statistics.inventory(currency)),
    inventoryGraph: (_root: unknown, { limit }: { limit?: number | null }) =>
      guarded(() => statistics.graph(parseGraphOrderLimit(limit))),
  },
});
