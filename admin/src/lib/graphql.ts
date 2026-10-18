import { graphql as graphqlWithAuth, resolveGraphqlUrl } from '@/lib/graphqlClient';

const GRAPHQL_URL = resolveGraphqlUrl();

/** Authenticated GraphQL helper (Nest middleware). Prefer this over raw fetch. */
export async function gql<T = unknown>(query: string, variables?: Record<string, unknown>): Promise<T> {
    return graphqlWithAuth<T>(query, { variables });
}

/** @deprecated use gql — kept for imports that read the URL constant */
export { GRAPHQL_URL };

// Default tenant for now
export const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000010';
