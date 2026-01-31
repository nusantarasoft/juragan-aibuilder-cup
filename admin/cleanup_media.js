const fetch = require('node-fetch');

async function graphql(query, variables = {}) {
    const res = await fetch('http://127.0.0.1:4001/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables })
    });
    const json = await res.json();
    if (json.errors) throw new Error(json.errors[0].message);
    return json.data;
}

async function run() {
    console.log("Starting Full Cleanup (Depth Limit 20)...");

    const bucketsData = await graphql(`query { listBuckets { name } }`);
    const buckets = bucketsData.listBuckets || [];
    console.log(`Found ${buckets.length} buckets.`);

    for (const b of buckets) {
        console.log(`\nProcessing bucket: ${b.name}`);
        const allKeys = [];

        async function walk(prefix, depth = 0) {
            if (depth > 20) {
                console.warn(`    Depth limit reached at ${prefix}. Stopping recursion.`);
                return;
            }

            const q = `query List($p: String, $b: String) { listFilesInFolder(prefix: $p, bucket: $b) { key isFolder } }`;
            try {
                const data = await graphql(q, { p: prefix, b: b.name });
                const items = data.listFilesInFolder || [];

                // console.log(`    Walk(${prefix}): Found ${items.length} items.`);

                for (const item of items) {
                    if (allKeys.some(k => k.key === item.key)) continue;
                    allKeys.push(item);

                    if (item.isFolder) {
                        await walk(item.key, depth + 1);
                    }
                }
            } catch (err) {
                console.error(`    Error walking ${prefix}: ${err.message}`);
            }
        }

        await walk("");
        console.log(`  Found ${allKeys.length} items to delete.`);

        for (const item of allKeys.reverse()) {
            // console.log(`  Deleting ${item.key}...`);
            try {
                await graphql(
                    `mutation Del($key: String!, $bucket: String) { deleteFileByKey(key: $key, bucket: $bucket) }`,
                    { key: item.key, bucket: b.name }
                );
            } catch (e) {
                console.error(`  Failed deleteFileByKey: ${e.message}`);
            }
        }

        console.log(`  Deleting Bucket ${b.name}...`);
        try {
            await graphql(
                `mutation DelB($name: String!) { deleteBucket(name: $name) }`,
                { name: b.name }
            );
            console.log(`  Deleted Bucket ${b.name}.`);
        } catch (e) {
            console.error(`  Failed to delete bucket ${b.name}:`, e.message);
        }
    }

    console.log("\nCleanup Complete.");
}

run();
