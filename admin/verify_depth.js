const fetch = require('node-fetch');

async function run() {
    const BUCKET = "depth-test-bucket";
    console.log(`DEBUG: Creating bucket '${BUCKET}'...`);

    // 1. Create Bucket
    await fetch('http://127.0.0.1:4001/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: `mutation { createBucket(name: "${BUCKET}") }` })
    });

    // 2. Create Deep Structure: A/ -> A/B/ -> A/B/C/
    console.log("DEBUG: Creating deep folder structure...");
    const folders = ["A/", "A/B/", "A/B/C/"];

    for (const f of folders) {
        await fetch('http://127.0.0.1:4001/graphql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: `mutation { createFolder(bucket: "${BUCKET}", path: "${f}") }` })
        });
    }

    // 3. Query Children of A/
    console.log("\nDEBUG: Querying children of 'A/'...");
    const query = `query { listFolders(bucket: "${BUCKET}", prefix: "A/") { key } }`;
    const res = await fetch('http://127.0.0.1:4001/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
    });
    const json = await res.json();
    const children = json.data.listFolders || [];

    console.log("Returned children:", JSON.stringify(children.map(c => c.key)));

    // 4. Analysis
    const hasAuditC = children.some(c => c.key === "A/B/C/");
    const hasDirectB = children.some(c => c.key === "A/B/");

    if (hasAuditC) {
        console.log("FAIL: API returns grandchildren (A/B/C/) when asking for A/.");
        console.log("CONCLUSION: We MUST filter out non-direct children in mediaService.ts");
    } else if (hasDirectB) {
        console.log("PASS: API correctly returns only direct children.");
    } else {
        console.log("WARN: API returned nothing?");
    }
}

run();
