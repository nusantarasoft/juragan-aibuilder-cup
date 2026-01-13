// const fetch = require('node-fetch'); // Native fetch in Node 20

const ENDPOINT = 'http://localhost:4001/graphql';

async function verifySchema() {
    const query = `
    query Introspection {
        __schema {
            types {
                name
                fields {
                    name
                    args {
                        name
                        type {
                            name
                            kind
                            ofType {
                                name
                                kind
                            }
                        }
                    }
                }
            }
        }
    }
    `;

    try {
        console.log('Fetching schema from', ENDPOINT);
        const res = await fetch(ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query })
        });

        if (!res.ok) {
            throw new Error(`Failed to fetch schema: ${res.status} ${res.statusText}`);
        }

        const json = await res.json();
        const types = json.data.__schema.types;

        // Verify Query
        const queryType = types.find(t => t.name === 'Query');
        const checkDuplicate = queryType.fields.find(f => f.name === 'checkDuplicateMedia');

        if (checkDuplicate) {
            console.log('✅ Query.checkDuplicateMedia exists');
        } else {
            console.error('❌ Query.checkDuplicateMedia MISSING');
        }

        // Verify Mutation
        const mutationType = types.find(t => t.name === 'Mutation');
        const uploadFile = mutationType.fields.find(f => f.name === 'uploadFile');

        if (uploadFile) {
            console.log('✅ Mutation.uploadFile exists');
            const bucketArg = uploadFile.args.find(a => a.name === 'bucket');
            if (bucketArg) {
                console.log('✅ Mutation.uploadFile has "bucket" argument');
            } else {
                console.error('❌ Mutation.uploadFile MISSING "bucket" argument');
                console.log('Args found:', uploadFile.args.map(a => a.name));
            }
        } else {
            console.error('❌ Mutation.uploadFile MISSING');
        }

    } catch (e) {
        console.error('Error verifying schema:', e.message);
    }
}

verifySchema();
