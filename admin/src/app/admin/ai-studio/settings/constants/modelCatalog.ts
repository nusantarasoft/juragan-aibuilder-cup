import type { LlmProvider } from "../types";

export const CHAT_MODEL_CATALOG: Record<LlmProvider, { label: string; value: string }[]> = {
    anthropic: [
        { label: 'Claude 3.5 Haiku', value: 'claude-3-5-haiku-20241022' },
        { label: 'Claude 3.5 Sonnet', value: 'claude-3-5-sonnet-20241022' },
        { label: 'Claude 3 Opus', value: 'claude-3-opus-20240229' },
    ],
    google: [
        { label: 'Gemini 2.5 Flash', value: 'gemini-2.5-flash' },
        { label: 'Gemini 2.5 Pro', value: 'gemini-2.5-pro' },
        { label: 'Gemini 2.0 Flash', value: 'gemini-2.0-flash' },
    ],
    openai: [
        { label: 'GPT-4o', value: 'gpt-4o' },
        { label: 'GPT-4o mini', value: 'gpt-4o-mini' },
        { label: 'GPT-4 Turbo', value: 'gpt-4-turbo' },
    ],
    ollama: [
        { label: 'Llama 3', value: 'llama3' },
        { label: 'Llama 3.1', value: 'llama3.1' },
        { label: 'Mistral', value: 'mistral' },
        { label: 'Phi-3', value: 'phi3' },
    ],
};

export const EMBEDDING_MODEL_CATALOG = {
    google: [
        { label: 'Gemini Embedding 001 (768d)', value: 'gemini-embedding-001' },
    ],
    openai: [
        { label: 'text-embedding-3-small', value: 'text-embedding-3-small' },
        { label: 'text-embedding-3-large', value: 'text-embedding-3-large' },
    ],
    ollama: [
        { label: 'nomic-embed-text', value: 'nomic-embed-text' },
        { label: 'mxbai-embed-large', value: 'mxbai-embed-large' },
    ],
    vertex: [
        { label: 'multimodalembedding@001', value: 'multimodalembedding@001' },
    ],
};

export const EMBEDDING_PROVIDER_OPTIONS = [
    { label: 'Auto (detect from credentials)', value: 'auto' },
    { label: 'Google AI Studio', value: 'google_ai' },
    { label: 'Vertex AI', value: 'vertex' },
    { label: 'OpenAI', value: 'openai' },
    { label: 'Ollama (Local)', value: 'ollama' },
];
