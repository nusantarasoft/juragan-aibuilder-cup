import { describe, expect, it } from 'vitest';
import { maskSettingsForClient, mergeSettingsUpdate } from './ai-settings.types';

const sa = {
    type: 'service_account',
    project_id: 'demo-proj',
    private_key: '-----BEGIN PRIVATE KEY-----\\nABC\\n-----END PRIVATE KEY-----\\n',
    client_email: 'sa@demo-proj.iam.gserviceaccount.com',
};

describe('studio settings vertex credentials', () => {
    it('masks service account and sets configured flag', () => {
        const pub = maskSettingsForClient({
            default_llm_provider: 'google',
            default_embedding_provider: 'auto',
            anthropic_model: 'x',
            google_location: 'us-central1',
            google_model: 'gemini-2.5-flash',
            openai_model: 'gpt-4o',
            groq_model: 'x',
            ollama_base_url: 'http://127.0.0.1:11434',
            ollama_model: 'llama3',
            waha_dashboard_url: 'http://x',
            google_service_account_json: JSON.stringify(sa),
        } as any);
        expect(pub.google_service_account_configured).toBe(true);
        expect((pub as any).google_service_account_json).toBeUndefined();
    });

    it('merge validates and stores service account JSON', () => {
        const patch = mergeSettingsUpdate(null, {
            google_service_account_json: JSON.stringify(sa),
        });
        expect(typeof patch.google_service_account_json).toBe('string');
        expect(JSON.parse(String(patch.google_service_account_json)).client_email).toBe(sa.client_email);
    });

    it('merge clears service account when flag set', () => {
        const patch = mergeSettingsUpdate(null, { clear_google_service_account_json: true });
        expect(patch.google_service_account_json).toBeNull();
    });

    it('merge rejects invalid service account JSON', () => {
        expect(() =>
            mergeSettingsUpdate(null, { google_service_account_json: '{"foo":1}' }),
        ).toThrow(/invalid/i);
    });
});
