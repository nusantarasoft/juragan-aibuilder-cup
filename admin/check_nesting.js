const fetch = require('node-fetch');

async function run() {
    console.log("Checking prefix listing...");
    const val = {
        query: `query { 
            root: listFolders(bucket: "test-bucket-clean", prefix: "") { key }
            nested: listFolders(bucket: "test-bucket-clean", prefix: "my-folder/") { key }
        }`
    };

    try {
        const res = await fetch('http://127.0.0.1:4001/graphql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(val)
        });
        const json = await res.json();
        console.log("Root:", json.data.root);
        console.log("Nested (prefix='my-folder/'):", json.data.nested);
    } catch (e) {
        console.error("Error:", e);
    }
}
run();
