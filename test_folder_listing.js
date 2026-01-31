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

async function test() {
    console.log("Setting up test bucket 'test-vis-bucket'...");

    // 1. Create Bucket
    await runQuery(`mutation { createBucket(name: "test-vis-bucket") }`);

    // 2. Create Folder A
    console.log("Creating folder-A...");
    await runQuery(`mutation { createFolder(path: "folder-A/", bucket: "test-vis-bucket") }`);

    // 3. Create Folder B
    console.log("Creating folder-B...");
    await runQuery(`mutation { createFolder(path: "folder-B/", bucket: "test-vis-bucket") }`);

    // 4. List Folders
    console.log("Listing folders...");
    const res = await runQuery(`query { listFolders(bucket: "test-vis-bucket") { key isFolder } }`);

    if (res.errors) {
        console.error("Error listing:", res.errors);
    } else {
        const folders = res.data.listFolders;
        console.log("Folders found:", folders.map(f => f.key));
        if (folders.length !== 2) {
            console.error("FAIL: Expected 2 folders, found " + folders.length);
        } else {
            console.log("SUCCESS: Found 2 folders.");
        }
    }

    // Cleanup
    console.log("Cleaning up...");
    await runQuery(`mutation { deleteBucket(bucket: "test-vis-bucket") }`);
}

test();
