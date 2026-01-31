const http = require('http');

const GRAPHQL_OPTIONS = {
    hostname: 'localhost',
    port: 4001,
    path: '/graphql',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
};

function runQuery(query, variables = {}) {
    return new Promise((resolve, reject) => {
        const req = http.request(GRAPHQL_OPTIONS, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(e);
                }
            });
        });
        req.on('error', reject);
        req.write(JSON.stringify({ query, variables }));
        req.end();
    });
}

async function cleanup() {
    console.log('Fetching bucket list...');
    const listResponse = await runQuery(`query { listBuckets { name } }`);

    if (listResponse.errors) {
        console.error('Error fetching buckets:', listResponse.errors);
        return;
    }

    const allBuckets = listResponse.data.listBuckets;
    const bucketsToDelete = allBuckets.filter(b => b.name !== 'ns-system');

    console.log(`Found ${allBuckets.length} buckets. To delete: ${bucketsToDelete.length}`);

    for (const bucket of bucketsToDelete) {
        console.log(`Deleting bucket: ${bucket.name}...`);
        const delResponse = await runQuery(
            `mutation($bucket: String!) { deleteBucket(bucket: $bucket) }`,
            { bucket: bucket.name }
        );

        if (delResponse.data && delResponse.data.deleteBucket) {
            console.log(`✅ Deleted ${bucket.name}`);
        } else {
            console.error(`❌ Failed to delete ${bucket.name}`, delResponse.errors || delResponse);
        }
    }

    console.log('Cleanup complete.');
}

cleanup();
