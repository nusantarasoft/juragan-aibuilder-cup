import { Controller, Post, Get, Body, Logger, HttpCode } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface LabelStudioTask {
    id: number;
    data: {
        image?: string;
        text?: string;
        audio?: string;
        video?: string;
    };
}

interface PredictRequest {
    tasks: LabelStudioTask[];
    model_version?: string;
}

interface PredictionResult {
    from_name: string;
    to_name: string;
    type: string;
    value: any;
}

interface PredictResponse {
    results: Array<{
        model_version: string;
        score: number;
        result: PredictionResult[];
    }>;
}

interface SetupRequest {
    project: string;
    schema: string;
    hostname: string;
    access_token: string;
}

@Controller('ml')
export class MLBackendController {
    private readonly logger = new Logger(MLBackendController.name);
    private readonly MODEL_NAME = 'gemini-2.5-pro';

    constructor(private configService: ConfigService) { }

    @Get('health')
    health() {
        return { status: 'UP', model_class: 'VertexAIGeminiModel' };
    }

    @Post('setup')
    @HttpCode(200)
    setup(@Body() body: SetupRequest) {
        this.logger.log(`ML Backend setup called for project: ${body.project}`);
        return { model_version: this.MODEL_NAME };
    }

    @Post('predict')
    @HttpCode(200)
    async predict(@Body() body: PredictRequest): Promise<PredictResponse> {
        this.logger.log(`Predict called with ${body.tasks?.length || 0} task(s)`);

        if (!body.tasks || body.tasks.length === 0) {
            return { results: [] };
        }

        const results = await Promise.all(
            body.tasks.map(async (task) => {
                try {
                    if (task.data.image) {
                        return await this.processImage(task.data.image);
                    } else if (task.data.text) {
                        return await this.processText(task.data.text);
                    } else if (task.data.audio) {
                        return await this.processAudio(task.data.audio);
                    } else if (task.data.video) {
                        return await this.processVideo(task.data.video);
                    }
                    this.logger.warn(`Task ${task.id} has no valid data payload (image/text/audio/video)`);
                    return { model_version: this.MODEL_NAME, score: 0.5, result: [] };
                } catch (error) {
                    this.logger.error(`Prediction failed for task ${task.id}`, error);
                    return { model_version: this.MODEL_NAME, score: 0, result: [] };
                }
            })
        );

        return { results };
    }

    // Generic abstraction for calling Vertex AI
    private async callVertexAI(prompt: string, inlineData?: { mimeType: string, data: string }): Promise<string> {
        const { GoogleAuth } = await import('google-auth-library');
        const auth = new GoogleAuth({ scopes: 'https://www.googleapis.com/auth/cloud-platform' });
        const client = await auth.getClient();
        const accessToken = await client.getAccessToken();

        const projectId = this.configService.get('GOOGLE_CLOUD_PROJECT');
        const location = this.configService.get('GOOGLE_CLOUD_LOCATION') || 'us-central1';

        if (!projectId) {
            throw new Error('GOOGLE_CLOUD_PROJECT is not set in environment.');
        }

        const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${this.MODEL_NAME}:generateContent`;

        const parts: any[] = [{ text: prompt }];
        if (inlineData) {
            parts.push({ inlineData: { mimeType: inlineData.mimeType, data: inlineData.data } });
        }

        const requestBody = {
            contents: [{
                role: 'user',
                parts: parts
            }]
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Vertex AI API Error (${response.status}): ${errorText}`);
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) {
            throw new Error('Vertex AI returned empty response text');
        }

        return text;
    }

    private async processImage(imageUrl: string) {
        this.logger.log(`Processing image: ${imageUrl}`);

        try {
            // Label Studio local storage files start with /data/
            const fullUrl = imageUrl.startsWith('/data/')
                ? `http://labelstudio:8080${imageUrl}`
                : imageUrl;

            const response = await fetch(fullUrl);
            if (!response.ok) throw new Error(`Failed to fetch image: HTTP ${response.status} - ${response.statusText}`);

            const arrayBuffer = await response.arrayBuffer();
            const base64 = Buffer.from(arrayBuffer).toString('base64');
            let mimeType = response.headers.get('content-type') || 'image/jpeg';

            // basic fallback for binary stream
            if (mimeType === 'application/octet-stream') mimeType = 'image/jpeg';

            const prompt = `Analyze this image and provide classification labels. Return a JSON array of 3-5 high-quality labels that best describe the primary subjects and visual style. Example: ["Mountain", "Sunset", "Landscape"]. Only return the JSON array, absolutely no markdown formatting or other text.`;

            const textResponse = await this.callVertexAI(prompt, { mimeType, data: base64 });

            let labels: string[] = [];
            try {
                const cleaned = textResponse.replace(/```json|```/g, '').trim();
                labels = JSON.parse(cleaned);
            } catch {
                labels = textResponse.split(',').map((s: string) => s.trim().replace(/\[|\]/g, '')).filter(Boolean);
            }

            this.logger.log(`Generated image labels: ${labels.join(', ')}`);

            return {
                model_version: this.MODEL_NAME,
                score: 0.95,
                result: [{
                    from_name: 'label',
                    to_name: 'image',
                    type: 'choices',
                    value: { choices: labels.slice(0, 5) }
                }]
            };
        } catch (error) {
            this.logger.error('Image processing failed', error);
            return { model_version: this.MODEL_NAME, score: 0, result: [] };
        }
    }

    private async processText(text: string) {
        this.logger.log(`Processing text: ${text.substring(0, 50)}...`);

        try {
            const prompt = `Classify this text into rigid categories. Return a JSON array of 1-3 highly relevant category labels.
            
Text: "${text}"

Return only the raw JSON array string, absolutely no markdown formatting. Example: ["Business", "Technology"]`;

            const textResponse = await this.callVertexAI(prompt);

            let labels: string[] = [];
            try {
                const cleaned = textResponse.replace(/```json|```/g, '').trim();
                labels = JSON.parse(cleaned);
            } catch {
                labels = textResponse.split(',').map((s: string) => s.trim().replace(/\[|\]/g, '')).filter(Boolean);
                if (labels.length === 0) labels = ['uncategorized'];
            }

            this.logger.log(`Generated text labels: ${labels.join(', ')}`);

            return {
                model_version: this.MODEL_NAME,
                score: 0.9,
                result: [{
                    from_name: 'label',
                    to_name: 'text',
                    type: 'choices',
                    value: { choices: labels }
                }]
            };
        } catch (error) {
            this.logger.error('Text processing failed', error);
            return { model_version: this.MODEL_NAME, score: 0, result: [] };
        }
    }

    private async processAudio(audioUrl: string) {
        this.logger.log(`Processing audio: ${audioUrl}`);

        try {
            const fullUrl = audioUrl.startsWith('/data/')
                ? `http://labelstudio:8080${audioUrl}`
                : audioUrl;

            const response = await fetch(fullUrl);
            if (!response.ok) throw new Error(`Failed to fetch audio: HTTP ${response.status} - ${response.statusText}`);

            const arrayBuffer = await response.arrayBuffer();
            const base64 = Buffer.from(arrayBuffer).toString('base64');
            let mimeType = response.headers.get('content-type') || 'audio/mp3';

            // Ensure audio mime type for vertex. e.g. audio/mpeg
            if (mimeType === 'application/octet-stream' || mimeType.includes('mpeg')) mimeType = 'audio/mp3';

            const prompt = `Carefully listen to this audio clip and generate a highly accurate, word-for-word text transcription. Return ONLY the plain text transcription with no formatting, headers, or conversational text.`;

            const transcriptionResponse = await this.callVertexAI(prompt, { mimeType, data: base64 });

            this.logger.log(`Generated audio transcription length: ${transcriptionResponse.length} chars`);

            return {
                model_version: this.MODEL_NAME,
                score: 0.9,
                result: [{
                    from_name: 'transcription',
                    to_name: 'audio',
                    type: 'textarea',
                    value: { text: [transcriptionResponse.trim()] }
                }]
            };
        } catch (error) {
            this.logger.error('Audio processing failed', error);
            return {
                model_version: this.MODEL_NAME, score: 0, result: [{
                    from_name: 'transcription',
                    to_name: 'audio',
                    type: 'textarea',
                    value: { text: ['Transcription failed to generate.'] }
                }]
            };
        }
    }

    private async processVideo(videoUrl: string) {
        this.logger.log(`Processing video: ${videoUrl}`);

        try {
            const fullUrl = videoUrl.startsWith('/data/')
                ? `http://labelstudio:8080${videoUrl}`
                : videoUrl;

            const response = await fetch(fullUrl);
            if (!response.ok) throw new Error(`Failed to fetch video: HTTP ${response.status} - ${response.statusText}`);

            const arrayBuffer = await response.arrayBuffer();
            const base64 = Buffer.from(arrayBuffer).toString('base64');
            let mimeType = response.headers.get('content-type') || 'video/mp4';

            if (mimeType === 'application/octet-stream') mimeType = 'video/mp4';

            const prompt = `Analyze this video thoroughly. You are acting as an automatic classifier. Determine the best general classification categories for this entire video clip. Return a JSON array of 3-5 string labels. Example: ["Tutorial", "Gaming", "Commentary"]. Return only the raw JSON array string.`;

            const textResponse = await this.callVertexAI(prompt, { mimeType, data: base64 });

            let labels: string[] = [];
            try {
                const cleaned = textResponse.replace(/```json|```/g, '').trim();
                labels = JSON.parse(cleaned);
            } catch {
                labels = textResponse.split(',').map((s: string) => s.trim().replace(/\[|\]/g, '')).filter(Boolean);
            }

            this.logger.log(`Generated video labels: ${labels.join(', ')}`);

            return {
                model_version: this.MODEL_NAME,
                score: 0.85,
                result: [{
                    from_name: 'label',
                    to_name: 'video',
                    type: 'choices',
                    value: { choices: labels.slice(0, 5) }
                }]
            };
        } catch (error) {
            this.logger.error('Video processing failed', error);
            return { model_version: this.MODEL_NAME, score: 0, result: [] };
        }
    }
}
