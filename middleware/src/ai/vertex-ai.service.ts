import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class VertexAiService {
    private readonly logger = new Logger(VertexAiService.name);
    private readonly MODEL_NAME = 'gemini-2.5-pro';

    constructor(private configService: ConfigService) { }

    /**
     * Call Vertex AI with a text prompt.
     * Includes a graceful fallback if GCP credentials are not found.
     */
    async generateText(prompt: string, inlineData?: { mimeType: string, data: string }): Promise<string> {
        const projectId = this.configService.get('GOOGLE_CLOUD_PROJECT');

        if (!projectId) {
            this.logger.warn('GOOGLE_CLOUD_PROJECT is not set. Using fallback AI response.');
            return this.getFallbackResponse(prompt);
        }

        try {
            const { GoogleAuth } = await import('google-auth-library');
            const auth = new GoogleAuth({ scopes: 'https://www.googleapis.com/auth/cloud-platform' });
            const client = await auth.getClient();
            const accessToken = await client.getAccessToken();

            const location = this.configService.get('GOOGLE_CLOUD_LOCATION') || 'us-central1';
            const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${this.MODEL_NAME}:generateContent`;

            const parts: any[] = [{ text: prompt }];
            if (inlineData) {
                parts.push({ inlineData: { mimeType: inlineData.mimeType, data: inlineData.data } });
            }

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken?.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [{ role: 'user', parts }]
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                this.logger.error(`Vertex AI API Error (${response.status}): ${errorText}`);
                return this.getFallbackResponse(prompt);
            }

            const data = await response.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!text) {
                this.logger.warn('Vertex AI returned empty response. Using fallback.');
                return this.getFallbackResponse(prompt);
            }

            return text;

        } catch (error: any) {
            this.logger.error(`Failed to call Vertex AI: ${error.message}`);
            return this.getFallbackResponse(prompt);
        }
    }

    /**
     * Specialized method to force JSON output from Vertex AI.
     */
    async generateStructuredJSON(prompt: string): Promise<any> {
        const fullPrompt = `${prompt}\n\nIMPORTANT: Return ONLY valid JSON. Do not include markdown formatting like \`\`\`json.`;
        const text = await this.generateText(fullPrompt);

        try {
            // Clean up any potential markdown if the model ignored the instruction
            const cleaned = text.replace(/```json|```/g, '').trim();
            return JSON.parse(cleaned);
        } catch (error) {
            this.logger.error(`Failed to parse Vertex AI JSON response. Raw text: ${text.substring(0, 50)}...`);
            throw new Error('AI returned invalid JSON');
        }
    }

    private getFallbackResponse(prompt: string): string {
        // Simple heuristic fallbacks when no GCP credentials exist
        if (prompt.includes('score this lead') || prompt.includes('Lead info')) {
            return JSON.stringify({
                score: 75,
                grade: 'B',
                factors: ['+12 Has email and phone', '+15 Highly engaged (Dummy)', '+5 Good source']
            });
        }

        if (prompt.includes('analyze this deal') || prompt.includes('Deal info')) {
            return JSON.stringify({
                riskLevel: 'medium',
                insights: ['⚠️ Deal is progressing slowly in proposal stage (Dummy)', '💰 Solid deal value'],
                recommendation: 'Schedule a follow-up call within 48 hours to secure commitment. (Dummy)'
            });
        }

        return "This is a fallback response because Vertex AI is not configured. Please set GOOGLE_CLOUD_PROJECT.";
    }
}
