
const Minio = require('minio');

const minioClient = new Minio.Client({
    endPoint: 'minio',
    port: 9000,
    useSSL: false,
    accessKey: 'supa-storage',
    secretKey: 'secret1234'
});

async function run() {
    try {
        console.log('Listing buckets...');
        const buckets = await minioClient.listBuckets();
        console.log('Buckets:', buckets.map(b => b.name));

        const bucket = 'ns-system';
        const prefix = '_thumbnails/';

        console.log(`Listing objects in ${bucket} with prefix ${prefix}...`);

        const stream = minioClient.listObjects(bucket, prefix, true);

        stream.on('data', function (obj) {
            console.log(' -', obj.name);
        });

        stream.on('error', function (err) {
            console.log('Error listing objects:', err);
        });

        stream.on('end', function () {
            console.log('Done listing.');
        });
    } catch (e) {
        console.error('Error:', e);
    }
}

run();
