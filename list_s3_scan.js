const Minio = require('minio');

// Prioritize the environment variables used by the middleware service
const accessKey = process.env.S3_ACCESS_KEY || process.env.MINIO_ROOT_USER || 'minioadmin';
const secretKey = process.env.S3_SECRET_KEY || process.env.MINIO_ROOT_PASSWORD || 'minioadmin';
const endPoint = 'minio'; // Hardcoded internal hostname
const port = 9000;

console.log(`Connecting to S3: ${endPoint}:${port} as ${accessKey}`);

const minioClient = new Minio.Client({
    endPoint,
    port,
    useSSL: false,
    accessKey,
    secretKey
});

(async () => {
    try {
        const buckets = await minioClient.listBuckets();
        console.log('\n--- COMPLETE S3 DIRECTORY LISTING ---');
        for (const b of buckets) {
            console.log(`\n[BUCKET] ${b.name}`);
            const stream = minioClient.listObjectsV2(b.name, '', true);
            let count = 0;
            for await (const obj of stream) {
                const isFolder = obj.name.endsWith('/') || obj.size === 0;
                const typeLabel = isFolder ? '(FOLDER)' : '(FILE)';
                const sizeLabel = obj.size < 1024 ? `${obj.size} B` : `${(obj.size / 1024).toFixed(1)} KB`;

                // Indent based on depth
                const depth = obj.name.split('/').length - 1;
                const indent = '  '.repeat(depth + 1);

                console.log(`${indent}- ${obj.name} ${typeLabel} [${sizeLabel}]`);
                count++;
            }
            if (count === 0) console.log('  (Empty Bucket)');
        }
        console.log('\n--- END ---');
    } catch (e) {
        console.error('SCAN FAILED:', e.message);
        if (e.code === 'AccessDenied') {
            console.error('Please check MINIO_ROOT_USER/PASSWORD in .env file.');
        }
    }
})();
