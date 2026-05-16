/**
 * GraphQL Client for Admin CMS
 * All API requests go through NestJS Middleware
 */

const GRAPHQL_URL = (typeof window === 'undefined' && process.env.GRAPHQL_API_URL)
    ? process.env.GRAPHQL_API_URL
    : (process.env.NEXT_PUBLIC_GRAPHQL_URL || 'http://127.0.0.1:4001/graphql');

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
    const { token, variables } = options;

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
    users: `query { users { id email fullName role createdAt } }`,
    user: `query User($id: ID!) { user(id: $id) { id email fullName role createdAt } }`,
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
    updateUser: `mutation UpdateUser($id: ID!, $input: UpdateUserInput!) {
        updateUser(id: $id, updateUserInput: $input) {
            id
            email
            fullName
            role
        }
    }`,

    deleteUser: `mutation DeleteUser($id: ID!) {
        deleteUser(id: $id) { success }
    }`,
};

export default { graphql, queries, mutations };
