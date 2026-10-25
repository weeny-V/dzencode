import 'server-only';

import { getJson } from './server';

interface GraphqlBody<T> {
  data?: T | null;
  errors?: { message: string }[];
}

/**
 * Read-only GraphQL over GET. It goes through `getJson`, so it keeps the same session check before warmed
 * hits, session-isolated keys, tags and TTL as every REST read. Mutations stay on REST.
 */
export async function queryGraphql<T>(
  query: string,
  variables: Record<string, string | number>,
  options: { tags: string[]; revalidate?: number; signal?: AbortSignal },
): Promise<T> {
  const search = new URLSearchParams({
    query: query.replace(/\s+/g, ' ').trim(),
    variables: JSON.stringify(variables),
  });
  const body = await getJson<GraphqlBody<T>>(`/graphql?${search}`, options);
  if (body.errors?.length || !body.data)
    throw new Error(body.errors?.[0]?.message ?? 'Empty GraphQL response');
  return body.data;
}
