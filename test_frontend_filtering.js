
// Replicating logic from admin/src/lib/mediaService.ts

function filterFolders(folders, prefix) {
    const normalize = (str) => (str || '').replace(/\/+$/, '');
    const safePrefix = normalize(prefix);
    const prefixDepth = safePrefix === '' ? 0 : safePrefix.split('/').length;

    console.log(`Prefix: "${prefix}" -> SafePrefix: "${safePrefix}" (Depth: ${prefixDepth})`);

    return folders.filter(f => {
        const safeKey = normalize(f.key);
        // 1. Block Self-reference
        if (safeKey === safePrefix) return false;

        // 2. Block Grandchildren (Strict tree depth)
        const childDepth = safeKey.split('/').length;
        console.log(`Checking "${f.key}" -> Safe: "${safeKey}" (Depth: ${childDepth}). Expecting: ${prefixDepth + 1}`);

        if (childDepth !== prefixDepth + 1) {
            console.log(`  -> Blocked (Depth mismatch)`);
            return false;
        }
        return true;
    });
}

// Scenarios
console.log("--- Scenario 1: Root listing ---");
const rootFolders = [
    { key: "folder-A/" },
    { key: "folder-B/" },
    { key: "nested/sub/" } // Should be blocked?
];
const res1 = filterFolders(rootFolders, "");
console.log("Result:", res1.map(f => f.key));

console.log("\n--- Scenario 2: Subfolder listing ---");
const subFolders = [
    { key: "folder-A/" }, // Self ref (normalized matches parent prefix?) No, parent is folder-A
    { key: "folder-A/sub1/" },
    { key: "folder-A/sub2/" },
    { key: "folder-B/" } // Sibling
];
// Listing inside "folder-A/"
const res2 = filterFolders(subFolders, "folder-A/");
console.log("Result:", res2.map(f => f.key));

console.log("\n--- Scenario 3: User Report ---");
// Created "f-01/" in "b-01".
// Maybe they created "b-01/" as a folder? No, it's a bucket.
// Listing root of "b-01".
const userFolders = [
    { key: "f-01/" },
    { key: "existing/" }
];
const res3 = filterFolders(userFolders, "");
console.log("Result:", res3.map(f => f.key));
