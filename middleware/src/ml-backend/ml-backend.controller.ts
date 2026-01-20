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

    constructor(private configService: ConfigService) { }

    @Get('health')
    health() {
        return { status: 'UP', model_class: 'GeminiVisionModel' };
    }

    @Post('setup')
    @HttpCode(200)
    setup(@Body() body: SetupRequest) {
        this.logger.log(`ML Backend setup called for project: ${body.project}`);
        return { model_version: 'gemini-2.0-flash' };
    }

    @Post('predict')
    @HttpCode(200)
    async predict(@Body() body: PredictRequest): Promise<PredictResponse> {
        this.logger.log(`Predict called with ${body.tasks.length} task(s)`);

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
                    // Fallback: empty prediction
                    return { model_version: 'gemini-2.0-flash', score: 0.5, result: [] };
                } catch (error) {
                    this.logger.error(`Prediction failed for task ${task.id}`, error);
                    return { model_version: 'gemini-2.0-flash', score: 0, result: [] };
                }
            })
        );

        return { results };
    }

    private async processImage(imageUrl: string) {
        this.logger.log(`Processing image: ${imageUrl}`);
        const apiKey = this.configService.get('GOOGLE_API_KEY');

        if (!apiKey) {
            this.logger.error('GOOGLE_API_KEY not configured');
            return { model_version: 'gemini-2.0-flash', score: 0, result: [] };
        }

        try {
            // Fetch image and convert to base64
            const response = await fetch(imageUrl);
            if (!response.ok) {
                throw new Error(`Failed to fetch image: ${response.statusText}`);
            }
            const arrayBuffer = await response.arrayBuffer();
            const base64 = Buffer.from(arrayBuffer).toString('base64');
            const mimeType = response.headers.get('content-type') || 'image/jpeg';

            // Call Gemini Vision API
            const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`;

            const prompt = `Analyze this image and provide classification labels. Return a JSON array of 3-5 labels that best describe the image content. Example: ["label1", "label2", "label3"]. Only return the JSON array, no other text.`;

            const geminiResponse = await fetch(geminiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            { text: prompt },
                            { inline_data: { mime_type: mimeType, data: base64 } }
                        ]
                    }]
                })
            });

            if (!geminiResponse.ok) {
                const err = await geminiResponse.text();
                throw new Error(`Gemini API failed: ${err}`);
            }

            const json = await geminiResponse.json();
            const text = json.candidates?.[0]?.content?.parts?.[0]?.text || '[]';

            // Parse labels
            let labels: string[] = [];
            try {
                const cleaned = text.replace(/```json|```/g, '').trim();
                labels = JSON.parse(cleaned);
            } catch {
                labels = text.split(',').map((s: string) => s.trim()).filter(Boolean);
            }

            this.logger.log(`Generated labels: ${labels.join(', ')}`);

            // Format for Label Studio (Choices format)
            return {
                model_version: 'gemini-2.0-flash',
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
            return { model_version: 'gemini-2.0-flash', score: 0, result: [] };
        }
    }

    private async processText(text: string) {
        this.logger.log(`Processing text: ${text.substring(0, 50)}...`);
        const apiKey = this.configService.get('GOOGLE_API_KEY');

        if (!apiKey) {
            return { model_version: 'gemini-2.0-flash', score: 0, result: [] };
        }

        try {
            const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`;

            const prompt = `Classify this text into categories. Return a JSON array of 1-3 relevant category labels.

Text: "${text}"

Return only the JSON array, no other text.`;

            const response = await fetch(geminiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }]
                })
            });

            if (!response.ok) {
                throw new Error(`Gemini API failed`);
            }

            const json = await response.json();
            const resultText = json.candidates?.[0]?.content?.parts?.[0]?.text || '[]';

            let labels: string[] = [];
            try {
                labels = JSON.parse(resultText.replace(/```json|```/g, '').trim());
            } catch {
                labels = ['uncategorized'];
            }

            return {
                model_version: 'gemini-2.0-flash',
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
            return { model_version: 'gemini-2.0-flash', score: 0, result: [] };
        }
    }

    private async processAudio(audioUrl: string) {
        this.logger.log(`Processing audio: ${audioUrl}`);
        // Audio transcription would go here
        // For now, return placeholder
        return {
            model_version: 'gemini-2.0-flash',
            score: 0.8,
            result: [{
                from_name: 'transcription',
                to_name: 'audio',
                type: 'textarea',
                value: { text: ['Transcription pending...'] }
            }]
        };
    }

    private async processVideo(videoUrl: string) {
        this.logger.log(`Processing video: ${videoUrl}`);
        // Video analysis would go here
        // For now, return placeholder
        return {
            model_version: 'gemini-2.0-flash',
            score: 0.8,
            result: [{
                from_name: 'label',
                to_name: 'video',
                type: 'choices',
                value: { choices: ['video_content'] }
            }]
        };
    }
}
