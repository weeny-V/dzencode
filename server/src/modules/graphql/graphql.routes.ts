import { GraphQLError } from 'graphql';
import { createSchema, createYoga } from 'graphql-yoga';

import type { StatisticsService } from '../statistics/index.js';
import { createResolvers } from './graphql.resolvers.js';
import { typeDefs } from './graphql.schema.js';

const INTERNAL = (message: string) =>
  new GraphQLError(message, { extensions: { code: 'INTERNAL_SERVER_ERROR' } });

/**
 * Domain validation errors reach the client; every other failure of a resolver is masked. The check is
 * structural: yoga and this package can load different copies of graphql, so `instanceof` is unreliable.
 */
const maskError = (error: unknown, message: string) => {
  const candidate = error as Partial<GraphQLError> | null;
  if (candidate?.extensions?.code === 'BAD_USER_INPUT')
    return new GraphQLError(String(candidate.message), {
      ...(candidate.path ? { path: candidate.path } : {}),
      extensions: candidate.extensions,
    });
  const failedInResolver =
    candidate?.originalError !== undefined && candidate.originalError !== null;
  return candidate?.name === 'GraphQLError' && !failedInResolver
    ? (error as GraphQLError)
    : INTERNAL(message);
};

/**
 * The yoga request handler. Authentication runs before it in the composition root; CORS and the browser UIs
 * stay off because the Next server is the only client and the app-level CORS policy already applies.
 */
export const createGraphqlHandler = (statistics: StatisticsService) =>
  createYoga({
    schema: createSchema({ typeDefs, resolvers: createResolvers(statistics) }),
    graphqlEndpoint: '/graphql',
    cors: false,
    graphiql: false,
    landingPage: false,
    logging: 'error',
    maskedErrors: { maskError },
  });
