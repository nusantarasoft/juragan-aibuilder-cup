// using native fetch in Node 20+

async function run() {
    const query = `
    mutation Upload($file: Upload!) {
      uploadFile(file: $file, autoLabel: false) {
        id
        filename
        checksum
        thumbnailUrl
        bucketName
      }
    }
  `;

    const operations = {
        query,
        variables: { file: null }
    };

    const map = {
        '0': ['variables.file']
    };

    const formData = new FormData();
    formData.append('operations', JSON.stringify(operations));
    formData.append('map', JSON.stringify(map));

    // Create dummy image (1x1 pixel png transparent)
    const buffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
    const file = new Blob([buffer], { type: 'image/png' });
    formData.append('0', file, 'integrity-check.png');

    console.log('Uploading test file...');
    try {
        const res = await fetch('http://localhost:4001/graphql', {
            method: 'POST',
            body: formData,
            headers: {
                'apollo-require-preflight': 'true'
            }
        });

        const json = await res.json();
        console.log('Response:', JSON.stringify(json, null, 2));

        if (json.errors) {
            console.error('Errors:', json.errors);
            process.exit(1);
        }

        const media = json.data.uploadFile;
        console.log('Uploaded ID:', media.id);
        console.log('Checksum:', media.checksum);

        if (!media.checksum) {
            console.error('FAIL: Checksum missing');
            process.exit(1);
        }

        console.log('Waiting 5s for thumbnail generation...');
        await new Promise(r => setTimeout(r, 5000));

        // Verify Thumbnail via Query
        const checkQuery = `
        query Check($id: String!) {
            mediaById(id: $id) {
                id
                thumbnailPath
                thumbnailUrl
            }
        }
    `;

        const res2 = await fetch('http://localhost:4001/graphql', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apollo-require-preflight': 'true'
            },
            body: JSON.stringify({ query: checkQuery, variables: { id: media.id } })
        });
        const json2 = await res2.json();
        console.log('Check Response:', JSON.stringify(json2, null, 2));

        const media2 = json2.data.mediaById;
        if (media2.thumbnailUrl && media2.thumbnailUrl.startsWith('http')) {
            console.log('SUCCESS: Thumbnail generated and URL signed.');
        } else {
            console.error('FAIL: Thumbnail URL missing or invalid.');
        }

    } catch (e) {
        console.error('Execution Failed:', e);
        process.exit(1);
    }
}

run();
