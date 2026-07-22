import { describe, expect, it, vi, beforeEach } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import { StudioResolver } from './studio.resolver';
import { DEFAULT_UMKM_COMMANDS } from './studio-umkm-commands';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_ID = '22222222-2222-4222-8222-222222222222';

type Ctx = { req: { user?: { id: string; email?: string; role?: string } } };
const ctx = (id: string = USER_ID): Ctx => ({
    req: { user: { id, email: 'a@b.co', role: 'admin' } },
});
const NO_USER_CTX: Ctx = { req: { user: undefined } };

function build() {
    const studioService = {
        getSettings: vi.fn().mockResolvedValue({ ok: 'settings' }),
        updateSettings: vi.fn().mockResolvedValue({ ok: 'updated' }),
        getAiStatus: vi.fn().mockResolvedValue({ ok: 'status' }),
        testAiConnection: vi.fn().mockResolvedValue({ ok: 'ai' }),
        getNotebooks: vi.fn().mockResolvedValue([{ id: 'nb-1' }]),
        assertNotebookOwner: vi.fn().mockResolvedValue(undefined),
        assertConversationOwner: vi.fn().mockResolvedValue(undefined),
        assertOutputOwner: vi.fn().mockResolvedValue(undefined),
        getNotebook: vi.fn().mockResolvedValue({ id: 'nb-1' }),
        createNotebook: vi.fn().mockResolvedValue({ id: 'nb-new' }),
        reindexNotebookSource: vi.fn().mockResolvedValue(true),
        reindexNotebook: vi.fn().mockResolvedValue(true),
        deleteNotebook: vi.fn().mockResolvedValue(true),
        updateNotebook: vi.fn().mockResolvedValue({ id: 'nb-1' }),
        addMediaAsSource: vi.fn().mockResolvedValue({ id: 'src-1' }),
        getSourceStatus: vi.fn().mockResolvedValue([{ id: 'src-1' }]),
        removeSource: vi.fn().mockResolvedValue(true),
        importUrl: vi.fn().mockResolvedValue({ id: 'src-url' }),
        addTextSource: vi.fn().mockResolvedValue({ id: 'src-text' }),
        createShareLink: vi.fn().mockResolvedValue({ token: 'tok', isShared: true }),
        revokeShareLink: vi.fn().mockResolvedValue(true),
        synthesizeAudioForOutput: vi.fn().mockResolvedValue({ url: 'http://x/a.mp3', cached: false }),
        chat: vi.fn().mockResolvedValue({ conversationId: 'c-1', answer: 'hi' }),
        getConversation: vi.fn().mockResolvedValue({ id: 'c-1' }),
        getConversations: vi.fn().mockResolvedValue([{ id: 'c-1' }]),
        generateReport: vi.fn().mockResolvedValue('# report'),
        getChunk: vi.fn().mockResolvedValue({ id: 'ch-1' }),
        getSourceDetail: vi.fn().mockResolvedValue({ source: { id: 's1' }, chunks: [], totalChunks: 0 }),
        generateBrief: vi.fn().mockResolvedValue({ summary: 's', cached: false }),
        listOutputs: vi.fn().mockResolvedValue([{ id: 'o-1' }]),
        deleteOutput: vi.fn().mockResolvedValue(true),
        generateStudioOutput: vi.fn().mockResolvedValue({ id: 'o-new' }),
        playgroundTest: vi.fn().mockResolvedValue({ output: 'ok' }),
    };
    const guideFlowService = {
        listFlows: vi.fn().mockResolvedValue([{ id: 'f-1' }]),
        getFlow: vi.fn().mockResolvedValue({ id: 'f-1' }),
        getPublishedFlowForNotebook: vi.fn().mockResolvedValue({ id: 'f-pub' }),
        listTemplates: vi.fn().mockResolvedValue([{ id: 't-1' }]),
        validateDefinition: vi.fn().mockResolvedValue({ valid: true }),
        createFlow: vi.fn().mockResolvedValue({ id: 'f-new' }),
        updateFlow: vi.fn().mockResolvedValue({ id: 'f-1' }),
        deleteFlow: vi.fn().mockResolvedValue(true),
        publishFlow: vi.fn().mockResolvedValue({ id: 'f-1', status: 'published' }),
        startGuidedSession: vi.fn().mockResolvedValue({ conversationId: 'c-g' }),
        guidedChatTurn: vi.fn().mockResolvedValue({ reply: 'ok' }),
        createAndPublishUmkmFlow: vi.fn().mockResolvedValue({ id: 'f-umkm' }),
    };
    const whatsAppService = {
        getConfig: vi.fn().mockResolvedValue({ id: 'wa-1' }),
        listConfigs: vi.fn().mockResolvedValue([{ id: 'wa-1' }]),
        getSecurityMeta: vi.fn().mockResolvedValue({ meta: true }),
        getWahaSessionStatus: vi.fn().mockResolvedValue({ status: 'WORKING' }),
        restartWahaSession: vi.fn().mockResolvedValue({ ok: true }),
        syncWahaSession: vi.fn().mockResolvedValue({ ok: true }),
        getWahaAuthQr: vi.fn().mockResolvedValue({ qr: 'data' }),
        startWahaSession: vi.fn().mockResolvedValue({ ok: true }),
        logoutWahaSession: vi.fn().mockResolvedValue({ ok: true }),
        updateConfig: vi.fn().mockResolvedValue({ id: 'wa-1', enabled: true }),
    };
    const umkmService = {
        setupUmkmNotebook: vi.fn().mockResolvedValue({ setup: true }),
        updateUmkmCommands: vi.fn().mockResolvedValue({ updated: true }),
    };

    const resolver = new StudioResolver(
        studioService as any,
        guideFlowService as any,
        whatsAppService as any,
        umkmService as any,
    );
    return { resolver, studioService, guideFlowService, whatsAppService, umkmService };
}

describe('StudioResolver — auth context', () => {
    it('throws Unauthorized when no user on context', async () => {
        const { resolver } = build();
        await expect(resolver.getNotebooks(NO_USER_CTX)).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('throws Unauthorized when req is missing entirely', async () => {
        const { resolver } = build();
        await expect(resolver.getNotebooks({} as any)).rejects.toBeInstanceOf(UnauthorizedException);
    });
});

describe('StudioResolver — settings', () => {
    let h: ReturnType<typeof build>;
    beforeEach(() => { h = build(); });

    it('getStudioSettings delegates', async () => {
        await expect(h.resolver.getStudioSettings('t1')).resolves.toEqual({ ok: 'settings' });
        expect(h.studioService.getSettings).toHaveBeenCalledWith('t1');
    });

    it('updateStudioSettings delegates', async () => {
        await h.resolver.updateStudioSettings('t1', { a: 1 });
        expect(h.studioService.updateSettings).toHaveBeenCalledWith('t1', { a: 1 });
    });

    it('getStudioAiStatus delegates', async () => {
        await h.resolver.getStudioAiStatus('t1');
        expect(h.studioService.getAiStatus).toHaveBeenCalledWith('t1');
    });

    it('testStudioAiConnection maps string overrides', async () => {
        await h.resolver.testStudioAiConnection('ollama', 't1', {
            ollama_base_url: 'http://x', ollama_model: 'llama',
        });
        expect(h.studioService.testAiConnection).toHaveBeenCalledWith('ollama', 't1', {
            ollamaBaseUrl: 'http://x', ollamaModel: 'llama',
        });
    });

    it('testStudioAiConnection ignores non-string overrides', async () => {
        await h.resolver.testStudioAiConnection('openai', undefined, {
            ollama_base_url: 123 as any, ollama_model: null as any,
        });
        expect(h.studioService.testAiConnection).toHaveBeenCalledWith('openai', undefined, {
            ollamaBaseUrl: undefined, ollamaModel: undefined,
        });
    });

    it('testStudioAiConnection with no overrides', async () => {
        await h.resolver.testStudioAiConnection('openai');
        expect(h.studioService.testAiConnection).toHaveBeenCalledWith('openai', undefined, {
            ollamaBaseUrl: undefined, ollamaModel: undefined,
        });
    });
});

describe('StudioResolver — notebooks', () => {
    let h: ReturnType<typeof build>;
    beforeEach(() => { h = build(); });

    it('getNotebooks uses token id and ignores client userId', async () => {
        await h.resolver.getNotebooks(ctx(USER_ID), OTHER_ID);
        expect(h.studioService.getNotebooks).toHaveBeenCalledWith(USER_ID);
    });

    it('getNotebook checks ownership then reads', async () => {
        await h.resolver.getNotebook(ctx(), 'nb-1');
        expect(h.studioService.assertNotebookOwner).toHaveBeenCalledWith('nb-1', USER_ID);
        expect(h.studioService.getNotebook).toHaveBeenCalledWith('nb-1');
    });

    it('createNotebook uses token id, ignores client userId, defaults audience admin', async () => {
        await h.resolver.createNotebook(ctx(USER_ID), 'Name', 'Desc', OTHER_ID, 'weird');
        expect(h.studioService.createNotebook).toHaveBeenCalledWith('Name', 'Desc', USER_ID, 'admin');
    });

    it('createNotebook accepts customer audience and null description', async () => {
        await h.resolver.createNotebook(ctx(), 'Name', null as any, OTHER_ID, 'customer');
        expect(h.studioService.createNotebook).toHaveBeenCalledWith('Name', '', USER_ID, 'customer');
    });

    it('reindexSource checks ownership', async () => {
        await h.resolver.reindexSource(ctx(), 'nb-1', 'src-1');
        expect(h.studioService.assertNotebookOwner).toHaveBeenCalledWith('nb-1', USER_ID);
        expect(h.studioService.reindexNotebookSource).toHaveBeenCalledWith('nb-1', 'src-1');
    });

    it('reindexNotebook checks ownership', async () => {
        await h.resolver.reindexNotebook(ctx(), 'nb-1');
        expect(h.studioService.reindexNotebook).toHaveBeenCalledWith('nb-1');
    });

    it('deleteNotebook checks ownership', async () => {
        await h.resolver.deleteNotebook(ctx(), 'nb-1');
        expect(h.studioService.deleteNotebook).toHaveBeenCalledWith('nb-1');
    });

    it('updateNotebook maps nullable fields to undefined', async () => {
        await h.resolver.updateNotebook(ctx(), 'nb-1', null as any, null as any, null as any, null as any);
        expect(h.studioService.updateNotebook).toHaveBeenCalledWith('nb-1', {
            name: undefined, description: undefined, chat_instruction: undefined, icon: undefined,
        });
    });

    it('updateNotebook passes provided fields', async () => {
        await h.resolver.updateNotebook(ctx(), 'nb-1', 'N', 'D', 'CI', '🚀');
        expect(h.studioService.updateNotebook).toHaveBeenCalledWith('nb-1', {
            name: 'N', description: 'D', chat_instruction: 'CI', icon: '🚀',
        });
    });

    it('propagates ownership failure and does not read notebook', async () => {
        h.studioService.assertNotebookOwner.mockRejectedValueOnce(new Error('forbidden'));
        await expect(h.resolver.getNotebook(ctx(), 'nb-x')).rejects.toThrow('forbidden');
        expect(h.studioService.getNotebook).not.toHaveBeenCalled();
    });
});

describe('StudioResolver — sources', () => {
    let h: ReturnType<typeof build>;
    beforeEach(() => { h = build(); });

    it('addMediaToNotebook checks ownership', async () => {
        await h.resolver.addMediaToNotebook(ctx(), 'nb-1', 'm-1');
        expect(h.studioService.assertNotebookOwner).toHaveBeenCalledWith('nb-1', USER_ID);
        expect(h.studioService.addMediaAsSource).toHaveBeenCalledWith('nb-1', 'm-1');
    });

    it('getSourceStatus checks ownership', async () => {
        await h.resolver.getSourceStatus(ctx(), 'nb-1');
        expect(h.studioService.getSourceStatus).toHaveBeenCalledWith('nb-1');
    });

    it('removeSource checks ownership', async () => {
        await h.resolver.removeSource(ctx(), 'nb-1', 'src-1');
        expect(h.studioService.removeSource).toHaveBeenCalledWith('nb-1', 'src-1');
    });

    it('synthesizeAudio checks ownership and forwards args', async () => {
        const res = await h.resolver.synthesizeAudio(ctx(USER_ID), 'nb-1', 'o-1', 'en');
        expect(h.studioService.assertNotebookOwner).toHaveBeenCalledWith('nb-1', USER_ID);
        expect(h.studioService.synthesizeAudioForOutput).toHaveBeenCalledWith('nb-1', 'o-1', 'en');
        expect(res).toEqual({ url: 'http://x/a.mp3', cached: false });
    });

    it('createShareLink checks ownership and forwards', async () => {
        const res = await h.resolver.createShareLink(ctx(USER_ID), 'nb-1');
        expect(h.studioService.assertNotebookOwner).toHaveBeenCalledWith('nb-1', USER_ID);
        expect(h.studioService.createShareLink).toHaveBeenCalledWith('nb-1');
        expect(res).toEqual({ token: 'tok', isShared: true });
    });

    it('revokeShareLink checks ownership and forwards', async () => {
        await h.resolver.revokeShareLink(ctx(USER_ID), 'nb-1');
        expect(h.studioService.assertNotebookOwner).toHaveBeenCalledWith('nb-1', USER_ID);
        expect(h.studioService.revokeShareLink).toHaveBeenCalledWith('nb-1');
    });

    it('addTextSource checks ownership and forwards args', async () => {
        await h.resolver.addTextSource(ctx(USER_ID), 'nb-1', 'Judul', 'isi teks panjang');
        expect(h.studioService.assertNotebookOwner).toHaveBeenCalledWith('nb-1', USER_ID);
        expect(h.studioService.addTextSource).toHaveBeenCalledWith('nb-1', 'Judul', 'isi teks panjang');
    });

    it('importUrl checks ownership', async () => {
        await h.resolver.importUrl(ctx(), 'nb-1', 'http://x');
        expect(h.studioService.importUrl).toHaveBeenCalledWith('nb-1', 'http://x');
    });
});

describe('StudioResolver — chat', () => {
    let h: ReturnType<typeof build>;
    beforeEach(() => { h = build(); });

    it('chat without conversationId uses token id and no conversation check', async () => {
        await h.resolver.chat(ctx(USER_ID), 'nb-1', 'q?', undefined as any, OTHER_ID, undefined as any, null as any);
        expect(h.studioService.assertNotebookOwner).toHaveBeenCalledWith('nb-1', USER_ID);
        expect(h.studioService.assertConversationOwner).not.toHaveBeenCalled();
        expect(h.studioService.chat).toHaveBeenCalledWith('nb-1', 'q?', undefined, USER_ID, {
            sourceIds: undefined,
            language: undefined,
        });
    });

    it('chat with conversationId + sourceIds checks conversation ownership', async () => {
        await h.resolver.chat(ctx(USER_ID), 'nb-1', 'q?', 'c-1', OTHER_ID, ['s1', 's2'], 'en');
        expect(h.studioService.assertConversationOwner).toHaveBeenCalledWith('c-1', USER_ID);
        expect(h.studioService.chat).toHaveBeenCalledWith('nb-1', 'q?', 'c-1', USER_ID, {
            sourceIds: ['s1', 's2'],
            language: 'en',
        });
    });

    it('getConversation checks conversation ownership', async () => {
        await h.resolver.getConversation(ctx(), 'c-1');
        expect(h.studioService.assertConversationOwner).toHaveBeenCalledWith('c-1', USER_ID);
        expect(h.studioService.getConversation).toHaveBeenCalledWith('c-1');
    });

    it('getConversations checks notebook ownership', async () => {
        await h.resolver.getConversations(ctx(), 'nb-1');
        expect(h.studioService.getConversations).toHaveBeenCalledWith('nb-1');
    });
});

describe('StudioResolver — generate', () => {
    let h: ReturnType<typeof build>;
    beforeEach(() => { h = build(); });

    it('generateReport checks ownership', async () => {
        await h.resolver.generateReport(ctx(), 'nb-1', 'q');
        expect(h.studioService.generateReport).toHaveBeenCalledWith('nb-1', 'q');
    });

    it('getChunk delegates (no notebook context)', async () => {
        await h.resolver.getChunk('ch-1');
        expect(h.studioService.getChunk).toHaveBeenCalledWith('ch-1');
    });

    it('getSourceDetail checks ownership and delegates', async () => {
        await h.resolver.getSourceDetail(ctx(), 'nb-1', 's-1');
        expect(h.studioService.assertNotebookOwner).toHaveBeenCalledWith('nb-1', USER_ID);
        expect(h.studioService.getSourceDetail).toHaveBeenCalledWith('nb-1', 's-1');
    });

    it('generateBrief with force true', async () => {
        await h.resolver.generateBrief(ctx(), 'nb-1', true);
        expect(h.studioService.generateBrief).toHaveBeenCalledWith('nb-1', true);
    });

    it('generateBrief defaults force to false', async () => {
        await h.resolver.generateBrief(ctx(), 'nb-1', undefined as any);
        expect(h.studioService.generateBrief).toHaveBeenCalledWith('nb-1', false);
    });

    it('listOutputs checks ownership', async () => {
        await h.resolver.listOutputs(ctx(), 'nb-1');
        expect(h.studioService.listOutputs).toHaveBeenCalledWith('nb-1');
    });

    it('deleteOutput checks output ownership', async () => {
        await h.resolver.deleteOutput(ctx(), 'o-1');
        expect(h.studioService.assertOutputOwner).toHaveBeenCalledWith('o-1', USER_ID);
        expect(h.studioService.deleteOutput).toHaveBeenCalledWith('o-1');
    });

    it('generateOutput with sourceIds', async () => {
        await h.resolver.generateOutput(ctx(), 'nb-1', 'report', 'q', ['s1'], null as any, null as any);
        expect(h.studioService.generateStudioOutput).toHaveBeenCalledWith('nb-1', 'report', 'q', ['s1'], undefined);
    });

    it('generateOutput without query/sourceIds', async () => {
        await h.resolver.generateOutput(ctx(), 'nb-1', 'quiz', null as any, undefined as any, null as any, null as any);
        expect(h.studioService.generateStudioOutput).toHaveBeenCalledWith('nb-1', 'quiz', undefined, undefined, undefined);
    });

    it('generateOutput forwards valid audioLength option', async () => {
        await h.resolver.generateOutput(ctx(), 'nb-1', 'audio_script', 'fokus', undefined as any, 'long', null as any);
        expect(h.studioService.generateStudioOutput).toHaveBeenCalledWith(
            'nb-1', 'audio_script', 'fokus', undefined, { audioLength: 'long', language: undefined },
        );
    });

    it('generateOutput forwards language option', async () => {
        await h.resolver.generateOutput(ctx(), 'nb-1', 'quiz', null as any, undefined as any, null as any, 'en');
        expect(h.studioService.generateStudioOutput).toHaveBeenCalledWith(
            'nb-1', 'quiz', undefined, undefined, { audioLength: undefined, language: 'en' },
        );
    });

    it('playgroundTest maps optional fields', async () => {
        await h.resolver.playgroundTest('u', 's', 0.5, 100);
        expect(h.studioService.playgroundTest).toHaveBeenCalledWith({
            userPrompt: 'u', systemPrompt: 's', temperature: 0.5, maxTokens: 100,
        });
    });

    it('playgroundTest with empty/nullish optional fields', async () => {
        await h.resolver.playgroundTest('u', '', undefined as any, undefined as any);
        expect(h.studioService.playgroundTest).toHaveBeenCalledWith({
            userPrompt: 'u', systemPrompt: undefined, temperature: undefined, maxTokens: undefined,
        });
    });
});

describe('StudioResolver — guide flows', () => {
    let h: ReturnType<typeof build>;
    beforeEach(() => { h = build(); });

    it('listGuideFlows checks ownership', async () => {
        await h.resolver.listGuideFlows(ctx(), 'nb-1');
        expect(h.guideFlowService.listFlows).toHaveBeenCalledWith('nb-1');
    });

    it('getGuideFlow delegates (flow id)', async () => {
        await h.resolver.getGuideFlow('f-1');
        expect(h.guideFlowService.getFlow).toHaveBeenCalledWith('f-1');
    });

    it('getPublishedGuideFlow checks ownership', async () => {
        await h.resolver.getPublishedGuideFlow(ctx(), 'nb-1');
        expect(h.guideFlowService.getPublishedFlowForNotebook).toHaveBeenCalledWith('nb-1');
    });

    it('listGuideFlowTemplates delegates', async () => {
        await h.resolver.listGuideFlowTemplates();
        expect(h.guideFlowService.listTemplates).toHaveBeenCalled();
    });

    it('validateGuideFlow delegates', async () => {
        await h.resolver.validateGuideFlow({ nodes: [] });
        expect(h.guideFlowService.validateDefinition).toHaveBeenCalledWith({ nodes: [] });
    });

    it('createGuideFlow maps known template', async () => {
        await h.resolver.createGuideFlow(ctx(), 'nb-1', 'Flow', { a: 1 }, 'umkm');
        expect(h.studioService.assertNotebookOwner).toHaveBeenCalledWith('nb-1', USER_ID);
        expect(h.guideFlowService.createFlow).toHaveBeenCalledWith('nb-1', 'Flow', { a: 1 }, 'umkm');
    });

    it('createGuideFlow ignores unknown template and null definition', async () => {
        await h.resolver.createGuideFlow(ctx(), 'nb-1', 'Flow', null as any, 'nope');
        expect(h.guideFlowService.createFlow).toHaveBeenCalledWith('nb-1', 'Flow', undefined, undefined);
    });

    it('updateGuideFlow builds patch (all fields)', async () => {
        await h.resolver.updateGuideFlow('f-1', 'N', { d: 1 }, 'published');
        expect(h.guideFlowService.updateFlow).toHaveBeenCalledWith('f-1', {
            name: 'N', definition: { d: 1 }, status: 'published',
        });
    });

    it('updateGuideFlow ignores null name and invalid status', async () => {
        await h.resolver.updateGuideFlow('f-1', null as any, undefined as any, 'bogus');
        expect(h.guideFlowService.updateFlow).toHaveBeenCalledWith('f-1', {});
    });

    it('updateGuideFlow accepts draft status', async () => {
        await h.resolver.updateGuideFlow('f-1', undefined as any, undefined as any, 'draft');
        expect(h.guideFlowService.updateFlow).toHaveBeenCalledWith('f-1', { status: 'draft' });
    });

    it('deleteGuideFlow delegates', async () => {
        await h.resolver.deleteGuideFlow('f-1');
        expect(h.guideFlowService.deleteFlow).toHaveBeenCalledWith('f-1');
    });

    it('publishGuideFlow delegates', async () => {
        await h.resolver.publishGuideFlow('f-1');
        expect(h.guideFlowService.publishFlow).toHaveBeenCalledWith('f-1');
    });

    it('startGuidedSession uses token id and checks ownership', async () => {
        await h.resolver.startGuidedSession(ctx(USER_ID), 'nb-1', 'f-1', OTHER_ID);
        expect(h.studioService.assertNotebookOwner).toHaveBeenCalledWith('nb-1', USER_ID);
        expect(h.guideFlowService.startGuidedSession).toHaveBeenCalledWith('nb-1', 'f-1', USER_ID);
    });

    it('guidedChat uses token id and checks ownership', async () => {
        await h.resolver.guidedChat(ctx(USER_ID), 'nb-1', 'f-1', 'c-1', 'hello', OTHER_ID);
        expect(h.guideFlowService.guidedChatTurn).toHaveBeenCalledWith('nb-1', 'f-1', 'hello', 'c-1', USER_ID);
    });
});

describe('StudioResolver — whatsapp/umkm', () => {
    let h: ReturnType<typeof build>;
    beforeEach(() => { h = build(); });

    it('studioWhatsAppConfig with tenant', async () => {
        await h.resolver.studioWhatsAppConfig('t1');
        expect(h.whatsAppService.getConfig).toHaveBeenCalledWith('t1');
    });

    it('studioWhatsAppConfig without tenant passes undefined', async () => {
        await h.resolver.studioWhatsAppConfig('');
        expect(h.whatsAppService.getConfig).toHaveBeenCalledWith(undefined);
    });

    it('studioWhatsAppConfigs delegates', async () => {
        await h.resolver.studioWhatsAppConfigs();
        expect(h.whatsAppService.listConfigs).toHaveBeenCalled();
    });

    it('studioWhatsAppSecurityMeta delegates', async () => {
        await h.resolver.studioWhatsAppSecurityMeta();
        expect(h.whatsAppService.getSecurityMeta).toHaveBeenCalled();
    });

    it('studioWhatsAppSessionStatus delegates', async () => {
        await h.resolver.studioWhatsAppSessionStatus();
        expect(h.whatsAppService.getWahaSessionStatus).toHaveBeenCalled();
    });

    it('restartStudioWahaSession delegates', async () => {
        await h.resolver.restartStudioWahaSession();
        expect(h.whatsAppService.restartWahaSession).toHaveBeenCalled();
    });

    it('syncStudioWahaSession delegates', async () => {
        await h.resolver.syncStudioWahaSession();
        expect(h.whatsAppService.syncWahaSession).toHaveBeenCalled();
    });

    it('studioWahaAuthQr with and without session', async () => {
        await h.resolver.studioWahaAuthQr('s1');
        expect(h.whatsAppService.getWahaAuthQr).toHaveBeenCalledWith('s1');
        await h.resolver.studioWahaAuthQr('');
        expect(h.whatsAppService.getWahaAuthQr).toHaveBeenCalledWith(undefined);
    });

    it('startStudioWahaSession passes session', async () => {
        await h.resolver.startStudioWahaSession('s1');
        expect(h.whatsAppService.startWahaSession).toHaveBeenCalledWith('s1');
    });

    it('logoutStudioWahaSession passes undefined when empty', async () => {
        await h.resolver.logoutStudioWahaSession('');
        expect(h.whatsAppService.logoutWahaSession).toHaveBeenCalledWith(undefined);
    });

    it('setupUmkmNotebook publishes flow by default', async () => {
        const res = await h.resolver.setupUmkmNotebook(ctx(), 'nb-1', 't1', undefined as any);
        expect(h.studioService.assertNotebookOwner).toHaveBeenCalledWith('nb-1', USER_ID);
        expect(h.umkmService.setupUmkmNotebook).toHaveBeenCalledWith('nb-1', 't1');
        expect(h.guideFlowService.createAndPublishUmkmFlow).toHaveBeenCalledWith('nb-1');
        expect(res.flow).toEqual({ id: 'f-umkm' });
    });

    it('setupUmkmNotebook skips flow when publishGuideFlow=false', async () => {
        const res = await h.resolver.setupUmkmNotebook(ctx(), 'nb-1', 't1', false);
        expect(h.guideFlowService.createAndPublishUmkmFlow).not.toHaveBeenCalled();
        expect(res.flow).toBeNull();
    });

    it('updateStudioUmkmCommands republishes by default', async () => {
        const res = await h.resolver.updateStudioUmkmCommands(ctx(), 'nb-1', { a: 1 }, undefined);
        expect(h.umkmService.updateUmkmCommands).toHaveBeenCalledWith('nb-1', { a: 1 });
        expect(h.guideFlowService.createAndPublishUmkmFlow).toHaveBeenCalledWith('nb-1');
        expect(res.flow).toEqual({ id: 'f-umkm' });
    });

    it('updateStudioUmkmCommands skips republish when false', async () => {
        const res = await h.resolver.updateStudioUmkmCommands(ctx(), 'nb-1', { a: 1 }, false);
        expect(h.guideFlowService.createAndPublishUmkmFlow).not.toHaveBeenCalled();
        expect(res.flow).toBeNull();
    });

    it('studioUmkmCommandsDefaults returns defaults', async () => {
        await expect(h.resolver.studioUmkmCommandsDefaults()).resolves.toBe(DEFAULT_UMKM_COMMANDS);
    });

    it('updateStudioWhatsAppConfig without notebookId skips ownership + setup', async () => {
        await h.resolver.updateStudioWhatsAppConfig(
            ctx(), '  ', null as any, true, null as any, undefined as any, undefined as any, undefined as any, undefined as any,
        );
        expect(h.studioService.assertNotebookOwner).not.toHaveBeenCalled();
        expect(h.whatsAppService.updateConfig).toHaveBeenCalledWith(
            {
                notebookId: null, enabled: true, allowlistPhones: [], useGuidedFlow: false,
                wahaSession: undefined, businessPhone: undefined, label: undefined,
            },
            undefined,
        );
        expect(h.umkmService.setupUmkmNotebook).not.toHaveBeenCalled();
    });

    it('updateStudioWhatsAppConfig with notebookId + tenant sets up and publishes flow', async () => {
        await h.resolver.updateStudioWhatsAppConfig(
            ctx(), 't1', 'nb-1', true, ['62812'], true, 'sess', '62800', 'Toko',
        );
        expect(h.studioService.assertNotebookOwner).toHaveBeenCalledWith('nb-1', USER_ID);
        expect(h.whatsAppService.updateConfig).toHaveBeenCalledWith(
            {
                notebookId: 'nb-1', enabled: true, allowlistPhones: ['62812'], useGuidedFlow: true,
                wahaSession: 'sess', businessPhone: '62800', label: 'Toko',
            },
            't1',
        );
        expect(h.umkmService.setupUmkmNotebook).toHaveBeenCalledWith('nb-1', 't1');
        expect(h.guideFlowService.createAndPublishUmkmFlow).toHaveBeenCalledWith('nb-1');
    });

    it('updateStudioWhatsAppConfig with notebookId but disabled skips umkm flow publish', async () => {
        await h.resolver.updateStudioWhatsAppConfig(
            ctx(), 't1', 'nb-1', false, undefined as any, false, undefined as any, undefined as any, undefined as any,
        );
        expect(h.umkmService.setupUmkmNotebook).toHaveBeenCalledWith('nb-1', 't1');
        expect(h.guideFlowService.createAndPublishUmkmFlow).not.toHaveBeenCalled();
    });
});
