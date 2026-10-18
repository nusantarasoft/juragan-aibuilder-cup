import { describe, expect, it, vi } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { StudioWaConversationsResolver } from './studio-wa-conversations.resolver';

describe('StudioWaConversationsResolver', () => {
    const svc = {
        assertSuperAdmin: vi.fn(),
        listConversations: vi.fn(async () => []),
        listMessages: vi.fn(async () => ({ messages: [] })),
        startTakeover: vi.fn(async () => ({ ok: true })),
        releaseTakeover: vi.fn(async () => ({ ok: true })),
        sendHumanReply: vi.fn(async () => ({ ok: true, messageId: 'm1' })),
    };
    const resolver = new StudioWaConversationsResolver(svc as any);
    const superCtx = { req: { user: { id: 'u1', role: 'super_admin', email: 'a@b.com' } } };
    const adminCtx = { req: { user: { id: 'u2', role: 'admin', email: 'c@d.com' } } };

    it('studioWaConversations requires super_admin', async () => {
        svc.assertSuperAdmin.mockImplementation((role?: string) => {
            if (role !== 'super_admin') throw new ForbiddenException();
        });
        await expect(resolver.studioWaConversations(adminCtx as any)).rejects.toBeInstanceOf(
            ForbiddenException,
        );
        await resolver.studioWaConversations(superCtx as any);
        expect(svc.listConversations).toHaveBeenCalled();
    });
});
