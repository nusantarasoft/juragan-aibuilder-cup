import * as Minio from 'minio';

async function test() {
    const minioClient = new Minio.Client({
        endPoint: 'localhost',
        port: 9000,
        useSSL: false,
        accessKey: 'supa-storage',
        secretKey: 'secret1234'
    });

    try {
        const bucket = 'b-01';
        console.log(`Listing versions for bucket: ${bucket}`);

        // Try listObjects with some guessed options
        const stream = minioClient.listObjects(bucket, '', true);
        stream.on('data', (obj) => {
            console.log('Object:', obj.name, 'VersionId:', (obj as any).versionId);
        });
        stream.on('error', (err) => console.error('Error:', err));
        stream.on('end', () => console.log('End Listing'));
    } catch (e) {
        console.error(e);
    }
}

test();
