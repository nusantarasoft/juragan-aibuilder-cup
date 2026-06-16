const res = await fetch('http://127.0.0.1:4001/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        query: 'mutation($email: String!, $password: String!) { signIn(email: $email, password: $password) { accessToken } }',
        variables: { email: 'test@example.com', password: 'wrongpassword' },
    }),
});
const json = await res.json();
console.log('status', res.status, JSON.stringify(json, null, 2));
