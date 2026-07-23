import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiSettingsService } from './ai-settings.service';
import { getVertexAccessToken } from './google-vertex-auth.util';
import type { PlaygroundResult } from './openai-ai.service';

@Injectable()
export class VertexAiService {
    private readonly logger = new Logger(VertexAiService.name);

    constructor(
        private configService: ConfigService,
        private readonly aiSettings: AiSettingsService,
    ) {}

    private async googleGenerativeModels(tenantId?: string): Promise<string[]> {
        const config = await this.aiSettings.getGoogleConfig(tenantId);
        const configured = config.model?.trim();
        const defaults = [
            'gemini-2.5-flash',
            'gemini-flash-latest',
            'gemini-2.0-flash-lite',
            'gemini-2.0-flash',
        ];
        if (configured) {
            return [configured, ...defaults.filter((m) => m !== configured)];
        }
        return defaults;
    }

    /**
     * Call Vertex AI with a text prompt.
     * Includes a graceful fallback if GCP credentials are not found.
     */
    async generateText(
        prompt: string,
        inlineData?: { mimeType: string; data: string },
        tenantId?: string,
    ): Promise<string> {
        const config = await this.aiSettings.getGoogleConfig(tenantId);
        const projectId = config.projectId;

        if (!projectId) {
            const apiKey = config.apiKey;
            if (apiKey) {
                const viaStudio = await this.generateTextViaGoogleAiStudio(apiKey, prompt, inlineData, tenantId);
                if (viaStudio.text) return viaStudio.text;
                if (viaStudio.userMessage) return viaStudio.userMessage;
            }
            this.logger.warn('Google is not configured. Set API key or Vertex project in AI Studio Settings.');
            return this.getFallbackResponse(prompt);
        }

        try {
            const accessToken = await getVertexAccessToken({
                serviceAccountJson: config.serviceAccountJson,
                projectId,
            });

            const location = config.location;
            const model = config.model;
            const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${model}:generateContent`;

            const parts: any[] = [{ text: prompt }];
            if (inlineData) {
                parts.push({ inlineData: { mimeType: inlineData.mimeType, data: inlineData.data } });
            }

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
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
     * Streaming variant of {@link generateText}. Invokes `onDelta` for every text
     * fragment received from Gemini's SSE endpoint and resolves with the full text.
     * Falls back to a single-shot emit (fallback response) if streaming is
     * unavailable or fails, so callers always get a usable result.
     */
    async generateTextStream(
        prompt: string,
        onDelta: (text: string) => void,
        inlineData?: { mimeType: string; data: string },
        tenantId?: string,
    ): Promise<string> {
        const config = await this.aiSettings.getGoogleConfig(tenantId);
        const projectId = config.projectId;
        const parts: any[] = [{ text: prompt }];
        if (inlineData) {
            parts.push({ inlineData: { mimeType: inlineData.mimeType, data: inlineData.data } });
        }
        const body = JSON.stringify({ contents: [{ role: 'user', parts }] });

        try {
            if (!projectId) {
                const apiKey = config.apiKey;
                if (!apiKey) return this.emitFallback(prompt, onDelta);
                for (const model of await this.googleGenerativeModels(tenantId)) {
                    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${encodeURIComponent(apiKey)}`;
                    const res = await fetch(url, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body,
                    });
                    if (!res.ok) {
                        if ([404, 429, 503].includes(res.status)) continue;
                        break;
                    }
                    const full = await this.consumeGeminiSse(res, onDelta);
                    if (full.trim()) return full;
                }
                return this.emitFallback(prompt, onDelta);
            }

            const accessToken = await getVertexAccessToken({
                serviceAccountJson: config.serviceAccountJson,
                projectId,
            });
            const location = config.location;
            const model = config.model;
            const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${model}:streamGenerateContent?alt=sse`;

            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body,
            });
            if (!res.ok) {
                const errText = await res.text();
                this.logger.error(`Vertex AI stream error (${res.status}): ${errText.slice(0, 200)}`);
                return this.emitFallback(prompt, onDelta);
            }
            const full = await this.consumeGeminiSse(res, onDelta);
            return full.trim() ? full : this.emitFallback(prompt, onDelta);
        } catch (error: any) {
            this.logger.error(`Failed to stream from Vertex AI: ${error?.message}`);
            return this.emitFallback(prompt, onDelta);
        }
    }

    private emitFallback(prompt: string, onDelta: (text: string) => void): string {
        const text = this.getFallbackResponse(prompt);
        onDelta(text);
        return text;
    }

    /** Parse a Gemini `alt=sse` response body, emitting text fragments as they arrive. */
    private async consumeGeminiSse(
        res: Response,
        onDelta: (text: string) => void,
    ): Promise<string> {
        const reader = res.body?.getReader();
        if (!reader) return '';
        const decoder = new TextDecoder();
        let buffer = '';
        let full = '';
        const handleLine = (line: string) => {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data:')) return;
            const payload = trimmed.slice(5).trim();
            if (!payload || payload === '[DONE]') return;
            try {
                const json = JSON.parse(payload);
                const text: string = (json.candidates?.[0]?.content?.parts ?? [])
                    .map((p: { text?: string }) => p.text ?? '')
                    .join('');
                if (text) {
                    full += text;
                    onDelta(text);
                }
            } catch {
                /* ignore partial/non-JSON keepalive lines */
            }
        };
        // eslint-disable-next-line no-constant-condition
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';
            for (const line of lines) handleLine(line);
        }
        if (buffer) handleLine(buffer);
        return full;
    }

    /** Google AI Studio (API key) — used when Vertex/GCP is not configured. */
    private async generateTextViaGoogleAiStudio(
        apiKey: string,
        prompt: string,
        inlineData?: { mimeType: string; data: string },
        tenantId?: string,
    ): Promise<{ text?: string; userMessage?: string }> {
        const parts: { text?: string; inlineData?: { mimeType: string; data: string } }[] = [{ text: prompt }];
        if (inlineData) {
            parts.push({ inlineData: { mimeType: inlineData.mimeType, data: inlineData.data } });
        }

        let lastStatus: number | undefined;
        let lastModel: string | undefined;

        for (const model of await this.googleGenerativeModels(tenantId)) {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents: [{ role: 'user', parts }] }),
                });

                if (!response.ok) {
                    lastStatus = response.status;
                    lastModel = model;
                    const errorText = await response.text();
                    this.logger.warn(`Google AI Studio error (${response.status}, ${model}): ${errorText.slice(0, 200)}`);
                    if (response.status === 404 || response.status === 429 || response.status === 503) {
                        continue;
                    }
                    break;
                }

                const data = (await response.json()) as {
                    candidates?: { content?: { parts?: { text?: string }[] } }[];
                };
                const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text?.trim()) {
                    const models = await this.googleGenerativeModels(tenantId);
                    if (model !== models[0]) {
                        this.logger.log(`Google AI Studio succeeded with fallback model: ${model}`);
                    }
                    return { text };
                }
            } catch (error: unknown) {
                const msg = error instanceof Error ? error.message : String(error);
                this.logger.error(`Google AI Studio request failed (${model}): ${msg}`);
            }
        }

        return { userMessage: this.googleAiStudioUnavailableMessage(lastStatus, lastModel) };
    }

    private googleAiStudioUnavailableMessage(status?: number, model?: string): string {
        if (status === 429) {
            return (
                `Kuota Google AI Studio habis${model ? ` (model: ${model})` : ''}. ` +
                'Tunggu ~1 menit atau ganti model di AI Studio Settings.'
            );
        }
        if (status === 403) {
            return 'Google API key ditolak. Periksa kunci dan izin API di Google Cloud Console (AI Studio Settings).';
        }
        return 'Tidak dapat menghubungi Google AI. Periksa API key atau Vertex project di AI Studio Settings.';
    }

    /**
     * Specialized method to force JSON output from Vertex AI.
     */
    async generateStructuredJSON(prompt: string, tenantId?: string): Promise<any> {
        const fullPrompt = `${prompt}\n\nIMPORTANT: Return ONLY valid JSON. Do not include markdown formatting like \`\`\`json.`;
        const text = await this.generateText(fullPrompt, undefined, tenantId);

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
        // PM-specific fallbacks
        if (prompt.includes('WBS') || prompt.includes('Work Breakdown')) {
            return JSON.stringify({
                items: [
                    { wbsCode: '1', title: 'Project Initiation & Planning', level: 0, description: 'Project kickoff and planning activities', children: [
                        { wbsCode: '1.1', title: 'Stakeholder Management', level: 1, description: 'Identify and manage stakeholders', children: [
                            { wbsCode: '1.1.1', title: 'Stakeholder Identification', level: 2, description: 'Identify all project stakeholders', children: [
                                { wbsCode: '1.1.1.1', title: 'Internal Stakeholder Analysis', level: 3, description: 'Map all internal stakeholders', children: [
                                    { wbsCode: '1.1.1.1.1', title: 'Executive Stakeholder Mapping', level: 4, description: 'Map C-suite and VP-level stakeholders', children: [
                                        { wbsCode: '1.1.1.1.1.1', title: 'Conduct Executive Interviews', level: 5, description: 'Interview each executive stakeholder', children: [
                                            { wbsCode: '1.1.1.1.1.1.1', title: 'Prepare Interview Questionnaire', level: 6, description: 'Draft standardized interview questions', children: [
                                                { wbsCode: '1.1.1.1.1.1.1.1', title: 'Review Best Practices for Executive Engagement', level: 7, description: 'Research and compile best practices', children: [] }
                                            ]},
                                            { wbsCode: '1.1.1.1.1.1.2', title: 'Schedule Interview Sessions', level: 6, description: 'Coordinate calendars and book meetings', children: [] }
                                        ]},
                                        { wbsCode: '1.1.1.1.1.2', title: 'Document Executive Expectations', level: 5, description: 'Record key expectations from executives', children: [] }
                                    ]},
                                    { wbsCode: '1.1.1.1.2', title: 'Department-Level Stakeholder Mapping', level: 4, description: 'Map department heads and team leads', children: [] }
                                ]},
                                { wbsCode: '1.1.1.2', title: 'External Stakeholder Analysis', level: 3, description: 'Map external stakeholders', children: [] }
                            ]},
                            { wbsCode: '1.1.2', title: 'Stakeholder Engagement Plan', level: 2, description: 'Develop engagement strategies', children: [] }
                        ]},
                        { wbsCode: '1.2', title: 'Project Charter Development', level: 1, description: 'Develop project charter document', children: [
                            { wbsCode: '1.2.1', title: 'Draft Charter Document', level: 2, description: 'Write initial charter', children: [] },
                            { wbsCode: '1.2.2', title: 'Charter Review & Approval', level: 2, description: 'Get charter approved by sponsor', children: [] }
                        ]},
                        { wbsCode: '1.3', title: 'Kickoff Meeting', level: 1, description: 'Conduct project kickoff meeting', children: [] },
                    ]},
                    { wbsCode: '2', title: 'Requirements & Analysis', level: 0, description: 'Gather and analyze requirements', children: [
                        { wbsCode: '2.1', title: 'Requirements Gathering', level: 1, description: 'Collect business and technical requirements', children: [
                            { wbsCode: '2.1.1', title: 'Business Requirements', level: 2, description: 'Gather business requirements', children: [
                                { wbsCode: '2.1.1.1', title: 'User Story Workshops', level: 3, description: 'Conduct workshops to elicit user stories', children: [
                                    { wbsCode: '2.1.1.1.1', title: 'Prepare Workshop Agenda', level: 4, description: 'Draft agenda for each workshop session', children: [
                                        { wbsCode: '2.1.1.1.1.1', title: 'Identify Workshop Participants', level: 5, description: 'List all required attendees', children: [] },
                                        { wbsCode: '2.1.1.1.1.2', title: 'Book Workshop Venue', level: 5, description: 'Reserve meeting room or virtual space', children: [] }
                                    ]},
                                    { wbsCode: '2.1.1.1.2', title: 'Facilitate Workshop Sessions', level: 4, description: 'Run the actual workshop sessions', children: [] },
                                    { wbsCode: '2.1.1.1.3', title: 'Document Workshop Outcomes', level: 4, description: 'Record and distribute results', children: [] }
                                ]},
                                { wbsCode: '2.1.1.2', title: 'Process Flow Analysis', level: 3, description: 'Map current business processes', children: [] }
                            ]},
                            { wbsCode: '2.1.2', title: 'Technical Requirements', level: 2, description: 'Gather technical requirements', children: [] }
                        ]},
                        { wbsCode: '2.2', title: 'Requirements Analysis & Prioritization', level: 1, description: 'Analyze and prioritize requirements', children: [] },
                        { wbsCode: '2.3', title: 'Requirements Documentation & Approval', level: 1, description: 'Document approved requirements', children: [] },
                    ]},
                    { wbsCode: '3', title: 'Design & Architecture', level: 0, description: 'Design and architect the solution', children: [
                        { wbsCode: '3.1', title: 'System Architecture Design', level: 1, description: 'Create system architecture', children: [
                            { wbsCode: '3.1.1', title: 'High-Level Architecture', level: 2, description: 'Define overall system architecture', children: [
                                { wbsCode: '3.1.1.1', title: 'Component Diagram Design', level: 3, description: 'Design component interaction diagrams', children: [
                                    { wbsCode: '3.1.1.1.1', title: 'Define Service Boundaries', level: 4, description: 'Establish microservice boundaries', children: [
                                        { wbsCode: '3.1.1.1.1.1', title: 'API Contract Definition', level: 5, description: 'Define REST/GraphQL API contracts', children: [
                                            { wbsCode: '3.1.1.1.1.1.1', title: 'Write API Specifications', level: 6, description: 'Draft OpenAPI/GraphQL schema specs', children: [] },
                                            { wbsCode: '3.1.1.1.1.1.2', title: 'Review API Contracts with Team', level: 6, description: 'Peer review of API definitions', children: [] }
                                        ]}
                                    ]}
                                ]}
                            ]},
                            { wbsCode: '3.1.2', title: 'Database Design', level: 2, description: 'Design database schema and models', children: [] },
                            { wbsCode: '3.1.3', title: 'Security Architecture', level: 2, description: 'Design security controls and auth', children: [] }
                        ]},
                        { wbsCode: '3.2', title: 'UI/UX Design', level: 1, description: 'User interface and experience design', children: [
                            { wbsCode: '3.2.1', title: 'Wireframe Creation', level: 2, description: 'Create wireframes for all screens', children: [] },
                            { wbsCode: '3.2.2', title: 'Visual Design', level: 2, description: 'Create high-fidelity visual designs', children: [] }
                        ]}
                    ]},
                    { wbsCode: '4', title: 'Development & Implementation', level: 0, description: 'Build the solution', children: [
                        { wbsCode: '4.1', title: 'Backend Development', level: 1, description: 'Build server-side components', children: [
                            { wbsCode: '4.1.1', title: 'Core API Development', level: 2, description: 'Build core API endpoints', children: [
                                { wbsCode: '4.1.1.1', title: 'Authentication Module', level: 3, description: 'Implement authentication system', children: [] },
                                { wbsCode: '4.1.1.2', title: 'Business Logic Module', level: 3, description: 'Implement core business logic', children: [] }
                            ]},
                            { wbsCode: '4.1.2', title: 'Database Implementation', level: 2, description: 'Create database objects and migrations', children: [] }
                        ]},
                        { wbsCode: '4.2', title: 'Frontend Development', level: 1, description: 'Build client-side components', children: [
                            { wbsCode: '4.2.1', title: 'Component Library', level: 2, description: 'Build reusable UI components', children: [] },
                            { wbsCode: '4.2.2', title: 'Page Implementation', level: 2, description: 'Implement application pages', children: [] }
                        ]},
                        { wbsCode: '4.3', title: 'Integration', level: 1, description: 'Integrate all components', children: [] }
                    ]},
                    { wbsCode: '5', title: 'Testing & QA', level: 0, description: 'Quality assurance and testing', children: [
                        { wbsCode: '5.1', title: 'Test Planning', level: 1, description: 'Create test strategy and plans', children: [] },
                        { wbsCode: '5.2', title: 'Integration Testing', level: 1, description: 'Test integrated components', children: [] },
                        { wbsCode: '5.3', title: 'User Acceptance Testing', level: 1, description: 'End-user validation testing', children: [] },
                    ]},
                    { wbsCode: '6', title: 'Deployment & Closeout', level: 0, description: 'Deploy and close the project', children: [
                        { wbsCode: '6.1', title: 'Production Deployment', level: 1, description: 'Deploy to production', children: [] },
                        { wbsCode: '6.2', title: 'Training & Knowledge Transfer', level: 1, description: 'Train end users', children: [] },
                        { wbsCode: '6.3', title: 'Lessons Learned', level: 1, description: 'Document lessons learned', children: [] },
                        { wbsCode: '6.4', title: 'Project Closure', level: 1, description: 'Formal project closure', children: [] },
                    ]},
                ]
            });
        }

        if (prompt.includes('Stakeholder')) {
            return JSON.stringify({
                stakeholders: [
                    { name: 'Project Sponsor', role: 'Executive Sponsor', organization: 'C-Suite', interestLevel: 4, influenceLevel: 5, engagementStrategy: 'Regular executive briefings' },
                    { name: 'Product Owner', role: 'Requirements Owner', organization: 'Business Unit', interestLevel: 5, influenceLevel: 4, engagementStrategy: 'Daily standups and sprint reviews' },
                    { name: 'End Users', role: 'System Users', organization: 'Operations', interestLevel: 4, influenceLevel: 2, engagementStrategy: 'UAT sessions and training' },
                    { name: 'IT Operations', role: 'Infrastructure Support', organization: 'IT Department', interestLevel: 3, influenceLevel: 3, engagementStrategy: 'Technical reviews and deployment planning' },
                    { name: 'QA Lead', role: 'Quality Assurance', organization: 'QA Team', interestLevel: 4, influenceLevel: 3, engagementStrategy: 'Test plan reviews and defect triage' },
                ]
            });
        }

        if (prompt.includes('Risk') || prompt.includes('risk')) {
            return JSON.stringify({
                risks: [
                    { riskName: 'Resource Availability', description: 'Key team members may be unavailable', category: 'Management', probability: 3, impact: 4, mitigationStrategy: 'Cross-train team members', contingencyPlan: 'Engage contractors' },
                    { riskName: 'Scope Creep', description: 'Uncontrolled changes to project scope', category: 'Management', probability: 4, impact: 4, mitigationStrategy: 'Strict change control process', contingencyPlan: 'Re-baseline schedule and budget' },
                    { riskName: 'Technical Complexity', description: 'Technology stack may present unforeseen challenges', category: 'Technical', probability: 3, impact: 3, mitigationStrategy: 'Proof of concept and prototyping', contingencyPlan: 'Engage external consultants' },
                    { riskName: 'Schedule Delays', description: 'Project may fall behind schedule', category: 'Management', probability: 3, impact: 4, mitigationStrategy: 'Buffer time in schedule, weekly tracking', contingencyPlan: 'Fast-track or crash critical path activities' },
                ]
            });
        }

        if (prompt.includes('Communication') || prompt.includes('communication')) {
            return JSON.stringify({
                communications: [
                    { communicationItem: 'Weekly Status Report', targetAudience: 'Stakeholders & Sponsor', frequency: 'weekly', method: 'email', responsiblePerson: 'Project Manager', keyMessage: 'Project progress, risks, and upcoming activities' },
                    { communicationItem: 'Daily Standup', targetAudience: 'Development Team', frequency: 'daily', method: 'meeting', responsiblePerson: 'Scrum Master', keyMessage: 'Daily progress, blockers, and plans' },
                    { communicationItem: 'Sprint Review', targetAudience: 'Product Owner & Stakeholders', frequency: 'biweekly', method: 'presentation', responsiblePerson: 'Project Manager', keyMessage: 'Sprint deliverables demo and feedback' },
                    { communicationItem: 'Monthly Executive Briefing', targetAudience: 'Executive Leadership', frequency: 'monthly', method: 'report', responsiblePerson: 'Project Manager', keyMessage: 'High-level progress, budget status, key decisions' },
                    { communicationItem: 'Change Request Notification', targetAudience: 'Change Control Board', frequency: 'as_needed', method: 'email', responsiblePerson: 'Project Manager', keyMessage: 'Proposed changes, impact analysis, approval request' },
                ]
            });
        }

        if (prompt.includes('schedule') || prompt.includes('milestone') || prompt.includes('Schedule')) {
            return JSON.stringify({
                milestones: [
                    { name: 'Project Kickoff', plannedDate: '2026-01-15', status: 'completed', wbsCode: '1' },
                    { name: 'Requirements Approved', plannedDate: '2026-02-15', status: 'completed', wbsCode: '2' },
                    { name: 'Design Complete', plannedDate: '2026-03-15', status: 'in_progress', wbsCode: '3' },
                    { name: 'Development Complete', plannedDate: '2026-05-01', status: 'pending', wbsCode: '3' },
                    { name: 'UAT Sign-off', plannedDate: '2026-06-01', status: 'pending', wbsCode: '4' },
                    { name: 'Go-Live', plannedDate: '2026-06-15', status: 'pending', wbsCode: '5' },
                ],
                activities: [
                    { name: 'Gather requirements', durationDays: 10, wbsCode: '2.1' },
                    { name: 'Analyze requirements', durationDays: 5, wbsCode: '2.2' },
                    { name: 'Create architecture design', durationDays: 8, wbsCode: '3.1' },
                    { name: 'Build core modules', durationDays: 20, wbsCode: '3.2' },
                    { name: 'Unit testing', durationDays: 5, wbsCode: '3.3' },
                    { name: 'Integration testing', durationDays: 10, wbsCode: '4.1' },
                    { name: 'User acceptance testing', durationDays: 10, wbsCode: '4.2' },
                    { name: 'Deploy to production', durationDays: 3, wbsCode: '5.1' },
                ]
            });
        }

        if (prompt.includes('task') || prompt.includes('Task')) {
            return JSON.stringify({
                tasks: [
                    { title: 'Draft Project Charter', description: 'Create initial project charter document', priority: 'high', type: 'task', estimatedHours: 8, wbsCode: '1.2' },
                    { title: 'Conduct Stakeholder Interviews', description: 'Interview key stakeholders for requirements', priority: 'high', type: 'task', estimatedHours: 16, wbsCode: '2.1' },
                    { title: 'Create Requirements Document', description: 'Document all gathered requirements', priority: 'medium', type: 'task', estimatedHours: 12, wbsCode: '2.3' },
                    { title: 'Design System Architecture', description: 'Create high-level and detailed architecture', priority: 'high', type: 'task', estimatedHours: 24, wbsCode: '3.1' },
                    { title: 'Implement Core Features', description: 'Build the main application features', priority: 'high', type: 'story', estimatedHours: 40, wbsCode: '3.2' },
                    { title: 'Write Test Cases', description: 'Create comprehensive test suite', priority: 'medium', type: 'task', estimatedHours: 16, wbsCode: '4.1' },
                    { title: 'Prepare Training Materials', description: 'Create user training documentation', priority: 'low', type: 'task', estimatedHours: 8, wbsCode: '5.2' },
                ]
            });
        }

        if (prompt.includes('Tailoring') || prompt.includes('tailoring')) {
            return JSON.stringify({
                recommendations: [
                    { area: 'processes', tailoredApproach: 'Use Scrum with 2-week sprints', rationale: 'Team is experienced with agile', originalApproach: 'Waterfall lifecycle', impact: 'Faster delivery cycles' },
                    { area: 'artifacts', tailoredApproach: 'Lightweight documentation', rationale: 'Small team, clear communication channels', originalApproach: 'Full PMBOK documentation suite', impact: 'Reduced documentation overhead' },
                ]
            });
        }

        if (prompt.includes('Sustainability') || prompt.includes('sustainability') || prompt.includes('ESG')) {
            return JSON.stringify({
                metrics: [
                    { dimension: 'environmental', metricName: 'Carbon Footprint', unit: 'tCO2e', targetValue: 10, actualValue: 8, baselineValue: 15, description: 'Project carbon emissions' },
                    { dimension: 'social', metricName: 'Team Wellbeing Score', unit: 'score', targetValue: 4.5, actualValue: 4.2, baselineValue: 3.8, description: 'Team satisfaction index' },
                ]
            });
        }

        // CRM fallbacks
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

        // ITSM fallbacks
        if (prompt.includes('categorize') || prompt.includes('classify ticket') || prompt.includes('ticket category')) {
            return JSON.stringify({
                suggestedCategory: 'Software',
                suggestedPriority: 'medium',
                suggestedImpact: 'medium',
                suggestedUrgency: 'medium',
                confidence: 0.78,
                reasoning: 'Based on the ticket description, this appears to be a software-related issue with moderate business impact. (AI Fallback)',
                suggestedAssignmentGroup: 'L1 Support',
                relatedKBArticles: ['How to restart application services', 'Common software installation issues']
            });
        }

        if (prompt.includes('suggest resolution') || prompt.includes('resolution suggestion') || prompt.includes('troubleshoot')) {
            return JSON.stringify({
                suggestedSteps: [
                    'Verify the user\'s system meets minimum requirements',
                    'Clear application cache and temporary files',
                    'Restart the affected service or application',
                    'Check for pending updates or patches',
                    'If issue persists, escalate to L2 Support'
                ],
                estimatedResolutionTime: '30 minutes',
                confidence: 0.72,
                relatedIncidents: ['INC-0042: Similar issue resolved by cache clear', 'INC-0087: Required application restart']
            });
        }

        if (prompt.includes('SLA risk') || prompt.includes('sla analysis') || prompt.includes('ticket priority')) {
            return JSON.stringify({
                riskLevel: 'medium',
                slaStatus: 'on_track',
                remainingTime: '3h 45m',
                recommendation: 'Current ticket is within SLA limits but approaching the response deadline. Consider prioritizing this ticket. (AI Fallback)',
                suggestedEscalation: false,
                similarTicketsAvgResolution: '2h 15m'
            });
        }

        // Generic fallback — return empty JSON object instead of a string
        return JSON.stringify({
            message: 'AI is not configured. Configure a provider in AI Studio Settings.',
        });
    }

    /** Playground: system + user prompt with generation config (UC-18). */
    async playgroundGenerate(params: {
        systemPrompt?: string;
        userPrompt: string;
        temperature?: number;
        maxOutputTokens?: number;
    }, tenantId?: string): Promise<PlaygroundResult> {
        const temperature = Math.min(2, Math.max(0, params.temperature ?? 0.7));
        const maxOutputTokens = Math.min(8192, Math.max(64, params.maxOutputTokens ?? 2048));
        const systemPrompt = params.systemPrompt?.trim() || '';
        const userPrompt = params.userPrompt.trim();
        const inputChars = systemPrompt.length + userPrompt.length;
        const started = Date.now();

        const config = await this.aiSettings.getGoogleConfig(tenantId);
        const projectId = config.projectId;
        const apiKey = config.apiKey;

        const buildBody = (model?: string) => {
            const body: Record<string, unknown> = {
                contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
                generationConfig: { temperature, maxOutputTokens },
            };
            if (systemPrompt) {
                body.systemInstruction = { parts: [{ text: systemPrompt }] };
            }
            return body;
        };

        const parseUsage = (data: {
            usageMetadata?: {
                promptTokenCount?: number;
                candidatesTokenCount?: number;
                totalTokenCount?: number;
            };
            candidates?: { content?: { parts?: { text?: string }[] } }[];
        }) => ({
            text: data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '',
            promptTokens: data.usageMetadata?.promptTokenCount,
            completionTokens: data.usageMetadata?.candidatesTokenCount,
            totalTokens: data.usageMetadata?.totalTokenCount,
        });

        if (!projectId) {
            if (!apiKey) {
                const output = this.getFallbackResponse(userPrompt);
                return {
                    output,
                    latencyMs: Date.now() - started,
                    provider: 'fallback',
                    model: 'none',
                    inputChars,
                    outputChars: output.length,
                };
            }
            for (const model of await this.googleGenerativeModels(tenantId)) {
                const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
                try {
                    const response = await fetch(url, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(buildBody(model)),
                    });
                    if (!response.ok) {
                        if ([404, 429, 503].includes(response.status)) continue;
                        break;
                    }
                    const data = (await response.json()) as Parameters<typeof parseUsage>[0];
                    const parsed = parseUsage(data);
                    if (parsed.text) {
                        return {
                            output: parsed.text,
                            latencyMs: Date.now() - started,
                            provider: 'google_ai',
                            model,
                            inputChars,
                            outputChars: parsed.text.length,
                            promptTokens: parsed.promptTokens,
                            completionTokens: parsed.completionTokens,
                            totalTokens: parsed.totalTokens,
                        };
                    }
                } catch (e: unknown) {
                    this.logger.warn(`playgroundGenerate (${model}): ${e instanceof Error ? e.message : e}`);
                }
            }
            const msg = this.googleAiStudioUnavailableMessage();
            return {
                output: msg,
                latencyMs: Date.now() - started,
                provider: 'google_ai',
                model: 'unavailable',
                inputChars,
                outputChars: msg.length,
            };
        }

        try {
            const accessToken = await getVertexAccessToken({
                serviceAccountJson: config.serviceAccountJson,
                projectId,
            });
            const location = config.location;
            const model = config.model;
            const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${model}:generateContent`;

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(buildBody()),
            });

            if (!response.ok) {
                const errText = await response.text();
                this.logger.error(`playgroundGenerate Vertex error: ${response.status} ${errText.slice(0, 200)}`);
                const output = this.getFallbackResponse(userPrompt);
                return {
                    output,
                    latencyMs: Date.now() - started,
                    provider: 'vertex',
                    model,
                    inputChars,
                    outputChars: output.length,
                };
            }

            const data = (await response.json()) as Parameters<typeof parseUsage>[0];
            const parsed = parseUsage(data);
            const output = parsed.text || this.getFallbackResponse(userPrompt);
            return {
                output,
                latencyMs: Date.now() - started,
                provider: 'vertex',
                model,
                inputChars,
                outputChars: output.length,
                promptTokens: parsed.promptTokens,
                completionTokens: parsed.completionTokens,
                totalTokens: parsed.totalTokens,
            };
        } catch (e: unknown) {
            const output = this.getFallbackResponse(userPrompt);
            return {
                output,
                latencyMs: Date.now() - started,
                provider: 'vertex',
                model: config.model,
                inputChars,
                outputChars: output.length,
            };
        }
    }

    async testConnection(tenantId?: string): Promise<{ success: boolean; message: string; latencyMs: number; model: string }> {
        const config = await this.aiSettings.getGoogleConfig(tenantId);
        const started = Date.now();
        if (!config.apiKey && !config.projectId) {
            return {
                success: false,
                message: 'Google API key or Vertex project ID not configured',
                latencyMs: 0,
                model: config.model,
            };
        }
        const output = await this.generateText('Reply with exactly: OK', undefined, tenantId);
        const ok = output.trim().toUpperCase().includes('OK');
        return {
            success: ok,
            message: ok ? 'Google AI connection successful' : `Response: ${output.slice(0, 100)}`,
            latencyMs: Date.now() - started,
            model: config.model,
        };
    }
}
