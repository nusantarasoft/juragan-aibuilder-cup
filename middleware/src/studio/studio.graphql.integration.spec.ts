import { describe, expect, it } from 'vitest';
import { defaultGuideFlowDefinition } from './guide-flow.definition';
import { gqlRequest, isStudioIntegrationEnabled } from './studio-test.helpers';
import {
    authIntegrationCredentials,
    gqlRequest as authGqlRequest,
    isAuthIntegrationEnabled,
    SIGN_IN_MUTATION,
} from '../auth/auth-test.helpers';

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

    it('updateStudioNotebook accepts chatInstruction', async () => {
        const userId = process.env.STUDIO_INTEGRATION_USER_ID?.trim();
        const notebookId = process.env.STUDIO_INTEGRATION_NOTEBOOK_ID?.trim();
        if (!userId || !notebookId) return;

        const data = await gqlRequest<{ updateStudioNotebook: { id: string; context_config: { chat_instruction?: string } } }>(`
            mutation($notebookId: String!, $chatInstruction: String) {
                updateStudioNotebook(notebookId: $notebookId, chatInstruction: $chatInstruction)
            }
        `, { notebookId, chatInstruction: 'Jawab singkat dalam Bahasa Indonesia.' });

        expect(data.updateStudioNotebook.id).toBe(notebookId);
        expect(data.updateStudioNotebook.context_config?.chat_instruction).toContain('Bahasa Indonesia');
    });

    it('studioOutputs returns array for notebook', async () => {
        const notebookId = process.env.STUDIO_INTEGRATION_NOTEBOOK_ID?.trim();
        if (!notebookId) return;

        const data = await gqlRequest<{ studioOutputs: unknown[] }>(`
            query($notebookId: String!) {
                studioOutputs(notebookId: $notebookId)
            }
        `, { notebookId });
        expect(Array.isArray(data.studioOutputs)).toBe(true);
    });

    it('importStudioUrl rejects invalid URL', async () => {
        const notebookId = process.env.STUDIO_INTEGRATION_NOTEBOOK_ID?.trim();
        if (!notebookId) return;

        await expect(
            gqlRequest(`
                mutation($notebookId: String!, $url: String!) {
                    importStudioUrl(notebookId: $notebookId, url: $url)
                }
            `, { notebookId, url: 'not-a-url' }),
        ).rejects.toThrow();
    });

    it('studioChunk returns null for unknown id', async () => {
        const data = await gqlRequest<{ studioChunk: unknown }>(`
            query {
                studioChunk(chunkId: "00000000-0000-0000-0000-000000000000")
            }
        `);
        expect(data.studioChunk).toBeNull();
    });

    it('createStudioNotebook creates, lists, and deletes notebook for signed-in user', async () => {
        if (!isAuthIntegrationEnabled()) return;

        const creds = authIntegrationCredentials();
        const signedIn = await authGqlRequest<{
            signIn: { user: { id: string } };
        }>(SIGN_IN_MUTATION, creds);
        const userId = signedIn.signIn.user.id;

        const name = `Integration NB ${Date.now()}`;
        const created = await gqlRequest<{ createStudioNotebook: { id: string; name: string } }>(`
            mutation($name: String!, $description: String, $userId: String!) {
                createStudioNotebook(name: $name, description: $description, userId: $userId)
            }
        `, { name, description: 'integration test', userId });

        expect(created.createStudioNotebook.id).toBeTruthy();
        expect(created.createStudioNotebook.name).toBe(name);

        const listed = await gqlRequest<{ studioNotebooks: { id: string; name: string }[] }>(`
            query($userId: String!) {
                studioNotebooks(userId: $userId)
            }
        `, { userId });
        expect(listed.studioNotebooks.some((n) => n.id === created.createStudioNotebook.id)).toBe(true);

        const deleted = await gqlRequest<{ deleteStudioNotebook: boolean }>(`
            mutation($notebookId: String!) {
                deleteStudioNotebook(notebookId: $notebookId)
            }
        `, { notebookId: created.createStudioNotebook.id });
        expect(deleted.deleteStudioNotebook).toBe(true);
    });

    it('addMediaToNotebook links library media and returns source row', async () => {
        if (!isAuthIntegrationEnabled()) return;

        const creds = authIntegrationCredentials();
        const signedIn = await authGqlRequest<{
            signIn: { user: { id: string } };
        }>(SIGN_IN_MUTATION, creds);
        const userId = signedIn.signIn.user.id;

        const created = await gqlRequest<{ createStudioNotebook: { id: string } }>(`
            mutation($name: String!, $userId: String!) {
                createStudioNotebook(name: $name, userId: $userId)
            }
        `, { name: `Media NB ${Date.now()}`, userId });
        const notebookId = created.createStudioNotebook.id;

        const mediaList = await gqlRequest<{ media: { id: string }[] }>(`
            query { media(limit: 1) { id } }
        `);
        const mediaId = mediaList.media?.[0]?.id;
        if (!mediaId) return;

        const added = await gqlRequest<{
            addMediaToNotebook: {
                id: string;
                media_id: string;
                filename: string;
                file_size: number;
                parse_status: string;
            };
        }>(`
            mutation($notebookId: String!, $mediaId: String!) {
                addMediaToNotebook(notebookId: $notebookId, mediaId: $mediaId)
            }
        `, { notebookId, mediaId });

        expect(added.addMediaToNotebook.id).toBeTruthy();
        expect(added.addMediaToNotebook.media_id).toBe(mediaId);
        expect(added.addMediaToNotebook.filename).toBeTruthy();
        expect(added.addMediaToNotebook.file_size).toBeGreaterThan(0);
        expect(added.addMediaToNotebook.parse_status).toBe('pending');

        const sources = await gqlRequest<{ studioSourceStatus: { id: string; media_id?: string }[] }>(`
            query($notebookId: String!) {
                studioSourceStatus(notebookId: $notebookId)
            }
        `, { notebookId });
        expect(sources.studioSourceStatus.some((s) => s.id === added.addMediaToNotebook.id)).toBe(true);

        await gqlRequest(`
            mutation($notebookId: String!) {
                deleteStudioNotebook(notebookId: $notebookId)
            }
        `, { notebookId });
    });

    it('addMediaToNotebook rejects unknown media id', async () => {
        const notebookId = process.env.STUDIO_INTEGRATION_NOTEBOOK_ID?.trim();
        if (!notebookId) return;

        await expect(
            gqlRequest(`
                mutation($notebookId: String!, $mediaId: String!) {
                    addMediaToNotebook(notebookId: $notebookId, mediaId: $mediaId)
                }
            `, {
                notebookId,
                mediaId: '00000000-0000-0000-0000-000000000099',
            }),
        ).rejects.toThrow(/not found/i);
    });

    it('studioChat tolerates invalid userId (stores null owner on conversation)', async () => {
        let notebookId = process.env.STUDIO_INTEGRATION_NOTEBOOK_ID?.trim();
        if (!notebookId) {
            if (!isAuthIntegrationEnabled()) return;
            const creds = authIntegrationCredentials();
            const signedIn = await authGqlRequest<{ signIn: { user: { id: string } } }>(
                SIGN_IN_MUTATION,
                creds,
            );
            const created = await gqlRequest<{ createStudioNotebook: { id: string } }>(`
                mutation($name: String!, $userId: String!) {
                    createStudioNotebook(name: $name, userId: $userId)
                }
            `, {
                name: `Chat UUID test ${Date.now()}`,
                userId: signedIn.signIn.user.id,
            });
            notebookId = created.createStudioNotebook.id;
        }

        const data = await gqlRequest<{ studioChat: { conversationId: string; answer: string } }>(`
            mutation($notebookId: String!, $question: String!, $userId: String) {
                studioChat(notebookId: $notebookId, question: $question, userId: $userId)
            }
        `, {
            notebookId,
            question: 'Halo, tes chat dengan userId tidak valid',
            userId: 'not-a-uuid',
        });

        expect(data.studioChat.conversationId).toBeTruthy();
        expect(data.studioChat.answer.length).toBeGreaterThan(0);
    }, 60_000);

    it('studioAddTextSource rejects short text', async () => {
        const notebookId = process.env.STUDIO_INTEGRATION_NOTEBOOK_ID?.trim();
        if (!notebookId) return;

        await expect(
            gqlRequest(`
                mutation($notebookId: String!, $title: String!, $content: String!) {
                    studioAddTextSource(notebookId: $notebookId, title: $title, content: $content)
                }
            `, { notebookId, title: 'Pendek', content: 'abc' }),
        ).rejects.toThrow();
    });

    it('updateStudioNotebook accepts icon', async () => {
        const notebookId = process.env.STUDIO_INTEGRATION_NOTEBOOK_ID?.trim();
        if (!notebookId) return;

        const data = await gqlRequest<{ updateStudioNotebook: { id: string; icon?: string } }>(`
            mutation($notebookId: String!, $icon: String) {
                updateStudioNotebook(notebookId: $notebookId, icon: $icon)
            }
        `, { notebookId, icon: '🚀' });

        expect(data.updateStudioNotebook.id).toBe(notebookId);
        expect(data.updateStudioNotebook.icon).toBe('🚀');
    });

    it('share link create + revoke round-trip for signed-in owner', async () => {
        if (!isAuthIntegrationEnabled()) return;

        const creds = authIntegrationCredentials();
        const signedIn = await authGqlRequest<{ signIn: { user: { id: string } } }>(
            SIGN_IN_MUTATION,
            creds,
        );
        const userId = signedIn.signIn.user.id;

        const created = await gqlRequest<{ createStudioNotebook: { id: string } }>(`
            mutation($name: String!, $userId: String!) {
                createStudioNotebook(name: $name, userId: $userId)
            }
        `, { name: `Share NB ${Date.now()}`, userId });
        const notebookId = created.createStudioNotebook.id;

        const shared = await gqlRequest<{ studioCreateShareLink: { token: string; isShared: boolean } }>(`
            mutation($notebookId: String!) {
                studioCreateShareLink(notebookId: $notebookId)
            }
        `, { notebookId });
        expect(shared.studioCreateShareLink.isShared).toBe(true);
        expect(shared.studioCreateShareLink.token.length).toBeGreaterThan(8);

        const revoked = await gqlRequest<{ studioRevokeShareLink: boolean }>(`
            mutation($notebookId: String!) {
                studioRevokeShareLink(notebookId: $notebookId)
            }
        `, { notebookId });
        expect(revoked.studioRevokeShareLink).toBe(true);

        await gqlRequest(`
            mutation($notebookId: String!) {
                deleteStudioNotebook(notebookId: $notebookId)
            }
        `, { notebookId });
    });

    it('studioChat accepts language argument without error', async () => {
        const notebookId = process.env.STUDIO_INTEGRATION_NOTEBOOK_ID?.trim();
        if (!notebookId) return;

        const data = await gqlRequest<{ studioChat: { conversationId: string; answer: string } }>(`
            mutation($notebookId: String!, $question: String!, $language: String) {
                studioChat(notebookId: $notebookId, question: $question, language: $language)
            }
        `, {
            notebookId,
            question: 'Ringkas singkat isi notebook ini.',
            language: 'en',
        });
        expect(data.studioChat.conversationId).toBeTruthy();
        expect(data.studioChat.answer.length).toBeGreaterThan(0);
    }, 60_000);
});
