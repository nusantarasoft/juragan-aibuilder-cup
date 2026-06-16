const res = await fetch('http://127.0.0.1:4001/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        query: 'query { __typename }',
    }),
});
const json = await res.json();
console.log('status', res.status, JSON.stringify(json));
