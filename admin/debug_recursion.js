const fetch = require('node-fetch');

async function run() {
    console.log("DEBUG: 1. Listing Buckets...");

    const bucketQuery = `query { listBuckets { name } }`;

    try {
        const res = await fetch('http://127.0.0.1:4001/graphql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: bucketQuery })
        });
        const json = await res.json();
        const buckets = json.data.listBuckets;

        if (!buckets || buckets.length === 0) {
            console.log("No buckets found. Please create a bucket first via the UI.");
            return;
        }

        const bucketName = buckets[0].name;
        console.log(`Using bucket: ${bucketName}`);

        console.log("DEBUG: 2. Checking Root Folders...");
        const rootQuery = `query { listFolders(bucket: "${bucketName}", prefix: "") { key } }`;
        const rootRes = await fetch('http://127.0.0.1:4001/graphql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: rootQuery })
        });
        const rootJson = await rootRes.json();
        const rootFolders = rootJson.data.listFolders || [];
        console.log("Root Folders:", JSON.stringify(rootFolders, null, 2));

        if (rootFolders.length > 0) {
            const firstFolderKey = rootFolders[0].key;
            console.log(`DEBUG: 3. Checking Nested Folders for '${firstFolderKey}'...`);

            const nestedQuery = `query { listFolders(bucket: "${bucketName}", prefix: "${firstFolderKey}") { key } }`;
            const nestedRes = await fetch('http://127.0.0.1:4001/graphql', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: nestedQuery })
            });
            const nestedJson = await nestedRes.json();
            console.log("Nested result:", JSON.stringify(nestedJson.data.listFolders, null, 2));

            // Check specifically for self-reference
            const isSelfReferencing = nestedJson.data.listFolders?.some(f => f.key === firstFolderKey);
            console.log(`\nIS RECURSIVE (Self-referencing)? ${isSelfReferencing ? "YES !!! [BUG]" : "NO"}`);
        } else {
            console.log("No folders in root to test recursion.");
        }

    } catch (e) {
        console.error("Fetch Error:", e);
    }
}

run();
