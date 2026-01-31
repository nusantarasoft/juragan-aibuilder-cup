
const { VertexAI } = require('@google-cloud/vertexai');
require('dotenv').config();

async function main() {
    const projectId = process.env.GOOGLE_CLOUD_PROJECT;
    const location = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';

    console.log(`[Test] Project: ${projectId}, Location: ${location}`);

    if (!projectId) {
        console.error('[Error] GOOGLE_CLOUD_PROJECT not set in .env');
        return;
    }

    try {
        const vertexAI = new VertexAI({ project: projectId, location: location });
        const model = vertexAI.getGenerativeModel({ model: 'multimodalembedding' });

        console.log('[Test] Generating embedding for "Hello world"...');

        // Try the method used in RagService
        const result = await model.embedContent('Hello world');

        if (result.embedding && result.embedding.values) {
            console.log('[Success] Embedding generated!');
            console.log(`[Info] Vector length: ${result.embedding.values.length}`);
            console.log(`[Info] Sample: ${result.embedding.values.slice(0, 5)}...`);
        } else {
            console.error('[Fail] Result structure unexpected:', JSON.stringify(result, null, 2));
        }

    } catch (e) {
        console.error('[Exception]', e);
    }
}

main();
