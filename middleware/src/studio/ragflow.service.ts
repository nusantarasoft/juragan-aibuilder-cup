import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * RAGFlow API v1 client wrapper.
 * Handles all direct communication with the RAGFlow REST API.
 */
@Injectable()
export class RagflowService {
    private readonly logger = new Logger(RagflowService.name);
    private readonly baseUrl: string;
    private readonly apiKey: string;

    constructor(private configService: ConfigService) {
        this.baseUrl = this.configService.get('RAGFLOW_API_URL') || 'http://ragflow:9380';
        this.apiKey = this.configService.get('RAGFLOW_API_KEY') || '';

        if (!this.apiKey) {
            this.logger.warn('RAGFLOW_API_KEY not set — RAGFlow features disabled.');
        } else {
            this.logger.log(`RAGFlow client initialized at ${this.baseUrl}`);
        }
    }

    private get headers() {
        return {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
        };
    }

    private async request(method: string, path: string, body?: any, isFormData = false): Promise<any> {
        const url = `${this.baseUrl}/api/v1${path}`;
        const opts: RequestInit = {
            method,
            headers: isFormData
                ? { 'Authorization': `Bearer ${this.apiKey}` }
                : this.headers,
        };
        if (body) {
            opts.body = isFormData ? body : JSON.stringify(body);
        }

        this.logger.debug(`[RAGFlow] ${method} ${url}`);
        const response = await fetch(url, opts);
        const data = await response.json();

        if (data.code !== 0) {
            this.logger.error(`[RAGFlow] Error: ${JSON.stringify(data)}`);
            throw new Error(data.message || `RAGFlow API error: code ${data.code}`);
        }
        return data;
    }

    // ── Dataset (Knowledge Base) Management ──────────────────────────

    async createDataset(name: string, description?: string): Promise<{ id: string }> {
        const result = await this.request('POST', '/datasets', {
            name,
            description: description || '',
            embedding_model: 'gemini-embedding-001@Gemini',
            chunk_method: 'naive',
        });
        this.logger.log(`Created dataset: ${result.data.id} (${name})`);
        return { id: result.data.id };
    }

    async listDatasets(page = 1, pageSize = 30): Promise<any[]> {
        const result = await this.request('GET', `/datasets?page=${page}&page_size=${pageSize}`);
        return result.data || [];
    }

    async getDataset(datasetId: string): Promise<any> {
        const result = await this.request('GET', `/datasets?id=${datasetId}`);
        return result.data?.[0] || null;
    }

    async deleteDataset(datasetId: string): Promise<void> {
        await this.request('DELETE', '/datasets', { ids: [datasetId] });
        this.logger.log(`Deleted dataset: ${datasetId}`);
    }

    // ── Document Upload & Parsing ────────────────────────────────────

    async uploadDocument(datasetId: string, fileBuffer: Buffer, filename: string): Promise<any[]> {
        const formData = new FormData();
        const blob = new Blob([new Uint8Array(fileBuffer)]);
        formData.append('file', blob, filename);

        const url = `${this.baseUrl}/api/v1/datasets/${datasetId}/documents`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
            },
            body: formData,
        });
        const data = await response.json() as any;

        if (data.code !== 0) {
            throw new Error(data.message || 'Upload failed');
        }
        this.logger.log(`Uploaded document "${filename}" to dataset ${datasetId}`);
        return data.data || [];
    }

    async listDocuments(datasetId: string): Promise<any[]> {
        const result = await this.request('GET', `/datasets/${datasetId}/documents`);
        return result.data || [];
    }

    async parseDocuments(datasetId: string, documentIds: string[]): Promise<void> {
        await this.request('POST', `/datasets/${datasetId}/chunks`, {
            document_ids: documentIds,
        });
        this.logger.log(`Parsing ${documentIds.length} documents in dataset ${datasetId}`);
    }

    async getDocumentParseStatus(datasetId: string, documentId: string): Promise<any> {
        const docs = await this.listDocuments(datasetId);
        return docs.find((d: any) => d.id === documentId) || null;
    }

    // ── Chat Assistant ───────────────────────────────────────────────

    async createChatAssistant(name: string, datasetIds: string[]): Promise<{ id: string }> {
        const result = await this.request('POST', '/chats', {
            name,
            dataset_ids: datasetIds,
            llm: {
                model_name: 'gemini-2.0-flash@Gemini',
            },
            prompt: {
                system: `You are a helpful AI research assistant for "${name}". 
Answer questions based on the provided knowledge base documents. 
Always cite the source document when possible. 
If you cannot find the answer in the provided documents, say so honestly.`,
            },
        });
        this.logger.log(`Created chat assistant: ${result.data.id} (${name})`);
        return { id: result.data.id };
    }

    async chat(chatId: string, question: string, sessionId?: string, stream = false): Promise<any> {
        const body: any = {
            question,
            stream,
        };
        if (sessionId) {
            body.session_id = sessionId;
        }

        const url = `${this.baseUrl}/api/v1/chats/${chatId}/completions`;
        const response = await fetch(url, {
            method: 'POST',
            headers: this.headers,
            body: JSON.stringify(body),
        });

        if (stream) {
            return response; // caller handles SSE stream
        }

        const data = await response.json();
        if (data.code !== 0) {
            throw new Error(data.message || 'Chat failed');
        }
        return data.data;
    }

    async listChatSessions(chatId: string): Promise<any[]> {
        const result = await this.request('GET', `/chats/${chatId}/sessions`);
        return result.data || [];
    }

    async createChatSession(chatId: string, name?: string): Promise<{ id: string }> {
        const result = await this.request('POST', `/chats/${chatId}/sessions`, {
            name: name || 'New Session',
        });
        return { id: result.data.id };
    }

    async deleteChatSession(chatId: string, sessionIds: string[]): Promise<void> {
        await this.request('DELETE', `/chats/${chatId}/sessions`, { ids: sessionIds });
    }

    // ── Retrieval (standalone) ───────────────────────────────────────

    async retrieve(datasetIds: string[], question: string, topK = 5): Promise<any[]> {
        const result = await this.request('POST', '/retrieval', {
            dataset_ids: datasetIds,
            question,
            top_k: topK,
        });
        return result.data?.chunks || [];
    }
}
