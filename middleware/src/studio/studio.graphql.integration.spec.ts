import { describe, expect, it } from 'vitest';
import { defaultGuideFlowDefinition } from './guide-flow.definition';
import { gqlRequest, isStudioIntegrationEnabled } from './studio-test.helpers';

const RUN = isStudioIntegrationEnabled();

describe.skipIf(!RUN)('Studio GraphQL integration (live middleware)', () => {
    it('studioGuideFlowTemplates returns built-in templates', async () => {
        const data = await gqlRequest<{ studioGuideFlowTemplates: { kind: string; label: string }[] }>(`
            query {
                studioGuideFlowTemplates
            }
        `);
        const kinds = (data.studioGuideFlowTemplates || []).map((t) => t.kind).sort();
        expect(kinds).toEqual(['blank', 'rag_qa', 'umkm']);
    });

    it('studioValidateGuideFlow accepts default RAG definition', async () => {
        const def = defaultGuideFlowDefinition();
        const data = await gqlRequest<{
            studioValidateGuideFlow: {
                valid: boolean;
                nodeCount: number;
                xstateCoverage: boolean;
            };
        }>(`
            query($definition: JSONObject!) {
                studioValidateGuideFlow(definition: $definition)
            }
        `, { definition: def });
        expect(data.studioValidateGuideFlow.valid).toBe(true);
        expect(data.studioValidateGuideFlow.nodeCount).toBeGreaterThan(0);
        expect(data.studioValidateGuideFlow.xstateCoverage).toBe(true);
    });

    it('studioValidateGuideFlow rejects invalid definition', async () => {
        const data = await gqlRequest<{
            studioValidateGuideFlow: { valid: boolean; errors: string[] };
        }>(`
            query($definition: JSONObject!) {
                studioValidateGuideFlow(definition: $definition)
            }
        `, {
            definition: { version: 1, startNodeId: 'x', nodes: [] },
        });
        expect(data.studioValidateGuideFlow.valid).toBe(false);
        expect(data.studioValidateGuideFlow.errors.length).toBeGreaterThan(0);
    });

    it('studioPlaygroundTest returns output and metrics', async () => {
        const data = await gqlRequest<{
            studioPlaygroundTest: {
                output: string;
                latencyMs: number;
                provider: string;
                model: string;
            };
        }>(`
            mutation($userPrompt: String!, $systemPrompt: String, $temperature: Float, $maxTokens: Float) {
                studioPlaygroundTest(
                    userPrompt: $userPrompt
                    systemPrompt: $systemPrompt
                    temperature: $temperature
                    maxTokens: $maxTokens
                )
            }
        `, {
            userPrompt: 'Reply with exactly: OK',
            systemPrompt: 'You are a test assistant. Be brief.',
            temperature: 0,
            maxTokens: 32,
        });
        expect(data.studioPlaygroundTest.output.length).toBeGreaterThan(0);
        expect(data.studioPlaygroundTest.latencyMs).toBeGreaterThanOrEqual(0);
        expect(data.studioPlaygroundTest.provider).toBeTruthy();
    }, 60_000);
});
