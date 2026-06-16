const GRAPHQL = 'http://127.0.0.1:4001/graphql';

async function gql(query, variables) {
    const res = await fetch(GRAPHQL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables }),
        signal: AbortSignal.timeout(15000),
    });
    return res.json();
}

// 1. Health
const health = await gql('query { __typename }');
console.log('health:', JSON.stringify(health));

// 2. Sign in (wrong password — should return GraphQL error, not network failure)
const signIn = await gql(
    `mutation SignIn($input: SignInInput!) {
        signIn(input: $input) { accessToken refreshToken user { id email } }
    }`,
    { input: { email: 'test@example.com', password: 'wrongpassword' } },
);
console.log('signIn:', JSON.stringify(signIn, null, 2));

// 3. Me without token
const me = await gql('query { me { id email } }');
console.log('me (no token):', JSON.stringify(me, null, 2));
