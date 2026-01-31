const fetch = require('node-fetch');

async function run() {
    const BUCKET_NAME = "debug-bucket-" + Date.now();
    const FOLDER_NAME = "test-folder/";

    console.log(`DEBUG: Creating bucket '${BUCKET_NAME}'...`);
    const createBucketMutation = `mutation { createBucket(name: "${BUCKET_NAME}") }`;

    try {
        await fetch('http://127.0.0.1:4001/graphql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: createBucketMutation })
        });
        console.log("Bucket created.");

        console.log(`DEBUG: Creating folder '${FOLDER_NAME}' in '${BUCKET_NAME}'...`);
        const createFolderMutation = `mutation { createFolder(bucket: "${BUCKET_NAME}", path: "${FOLDER_NAME}") }`;
        await fetch('http://127.0.0.1:4001/graphql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: createFolderMutation })
        });
        console.log("Folder created.");

        console.log("DEBUG: Re-running recursion check...");

        // NOW CHECK FOR RECURSION
        const nestedQuery = `query { listFolders(bucket: "${BUCKET_NAME}", prefix: "${FOLDER_NAME}") { key } }`;
        const nestedRes = await fetch('http://127.0.0.1:4001/graphql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: nestedQuery })
        });
        const nestedJson = await nestedRes.json();
        const children = nestedJson.data.listFolders || [];
        console.log("Children of folder:", JSON.stringify(children, null, 2));

        const isrecursive = children.some(c => c.key === FOLDER_NAME);
        console.log(`\nIS RECURSIVE (Self-referencing)? ${isrecursive ? "YES !!! [BUG CONFIRMED]" : "NO"}`);

    } catch (e) {
        console.error("Error:", e);
    }
}

run();
