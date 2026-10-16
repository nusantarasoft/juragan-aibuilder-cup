/**
 * GraphQL Client for Admin CMS
 * All API requests go through NestJS Middleware
 */

import { clearAuthPresenceCookie, setAuthPresenceCookie } from '@/lib/authCookie';

const GRAPHQL_URL = (typeof window === 'undefined' && process.env.GRAPHQL_API_URL)
    ? process.env.GRAPHQL_API_URL
    : (process.env.NEXT_PUBLIC_GRAPHQL_URL || 'http://127.0.0.1:4001/graphql');

export const ACCESS_TOKEN_KEY = 'auth_access_token';
export const REFRESH_TOKEN_KEY = 'auth_refresh_token';

export function getStoredToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getStoredRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function storeAuthTokens(accessToken: string, refreshToken: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    setAuthPresenceCookie();
}

export function clearAuthTokens(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    clearAuthPresenceCookie();
}

const AUTH_ERROR_RE =
    /jwt|token|expired|invalid.*session|not authenticated|unauthorized/i;

export function isAuthGraphQLError(message: string): boolean {
    return AUTH_ERROR_RE.test(message);
}

export interface GraphQLResponse<T> {
    data?: T;
    errors?: Array<{ message: string; path?: string[] }>;
}

export interface GraphQLRequestOptions {
    token?: string;
    variables?: Record<string, unknown>;
}

/**
 * Execute a GraphQL query or mutation
 */
export async function graphql<T>(
    query: string,
    options: GraphQLRequestOptions = {}
): Promise<T> {
    const { variables } = options;
    const token = options.token ?? getStoredToken() ?? undefined;

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(GRAPHQL_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({ query, variables }),
        credentials: 'include',
    });

    const json: GraphQLResponse<T> = await response.json();

    if (json.errors && json.errors.length > 0) {
        throw new Error(json.errors[0].message);
    }

    if (!json.data) {
        throw new Error('No data returned from GraphQL');
    }

    return json.data;
}

/**
 * GraphQL Query Templates
 */
export const queries = {
    // Health check
    health: `query { health }`,

    // Auth queries
    me: `query { me { id email role } }`,

    // Pages queries
    pages: `query Pages($status: String) {
        pages(status: $status) {
            id
            title
            slug
            status
            authorId
            createdAt
            updatedAt
            publishedAt
        }
    }`,

    page: `query Page($id: ID!) {
        page(id: $id) {
            id
            title
            slug
            content
            status
            metaTitle
            metaDescription
            authorId
            createdAt
            updatedAt
            publishedAt
        }
    }`,

    pageBySlug: `query PageBySlug($slug: String!) {
        pageBySlug(slug: $slug) {
            id
            title
            slug
            content
            status
            metaTitle
            metaDescription
        }
    }`,

    // Users queries
    users: `query { users { id email fullName role status createdAt updatedAt } }`,
    user: `query User($id: ID!) { user(id: $id) { id email fullName role status createdAt updatedAt } }`,
};

/**
 * GraphQL Mutation Templates
 */
export const mutations = {
    // Auth mutations
    signIn: `mutation SignIn($email: String!, $password: String!) {
        signIn(input: { email: $email, password: $password }) {
            accessToken
            refreshToken
            user { id email role }
        }
    }`,

    signUp: `mutation SignUp($email: String!, $password: String!, $name: String) {
        signUp(input: { email: $email, password: $password, name: $name }) {
            accessToken
            refreshToken
            user { id email role }
        }
    }`,

    signOut: `mutation { signOut }`,

    refreshToken: `mutation RefreshToken($refreshToken: String!) {
        refreshToken(refreshToken: $refreshToken) {
            accessToken
            refreshToken
        }
    }`,

    // Pages mutations
    createPage: `mutation CreatePage($input: CreatePageInput!) {
        createPage(createPageInput: $input) {
            id
            title
            slug
            status
        }
    }`,

    updatePage: `mutation UpdatePage($id: ID!, $input: UpdatePageInput!) {
        updatePage(id: $id, updatePageInput: $input) {
            id
            title
            slug
            content
            status
        }
    }`,

    deletePage: `mutation DeletePage($id: ID!) {
        deletePage(id: $id) { success }
    }`,

    publishPage: `mutation PublishPage($id: ID!) {
        publishPage(id: $id) {
            id
            status
            publishedAt
        }
    }`,

    unpublishPage: `mutation UnpublishPage($id: ID!) {
        unpublishPage(id: $id) {
            id
            status
        }
    }`,

    // Users mutations
    createUser: `mutation CreateUser($input: CreateUserInput!) {
        createUser(input: $input) {
            id
            email
            fullName
            role
            status
            createdAt
            updatedAt
        }
    }`,

    updateUser: `mutation UpdateUser($id: ID!, $input: UpdateUserInput!) {
        updateUser(id: $id, input: $input) {
            id
            email
            fullName
            role
            status
            createdAt
            updatedAt
        }
    }`,

    setUserStatus: `mutation SetUserStatus($id: ID!, $status: String!) {
        setUserStatus(id: $id, status: $status) {
            id
            email
            fullName
            role
            status
        }
    }`,

    deleteUser: `mutation DeleteUser($id: ID!) {
        deleteUser(id: $id)
    }`,
};

export default { graphql, queries, mutations };
