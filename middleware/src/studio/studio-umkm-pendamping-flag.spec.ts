/**
 * F7 / F9 / F12 / F13 — updateUmkmCommands pendamping flag merge.
 */
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_UMKM_COMMANDS } from './studio-umkm-commands';
import { StudioUmkmService } from './studio-umkm.service';

function makeServiceWithConfig(existing: Record<string, unknown>) {
    let saved: Record<string, unknown> | null = null;
    const single = vi.fn(async () => ({
        data: {
            id: 'nb-1',
            context_config: saved ?? existing,
        },
        error: null,
    }));
    const chain: any = {
        select: () => chain,
        eq: () => chain,
        single,
        update: (payload: { context_config: Record<string, unknown> }) => {
            saved = payload.context_config;
            return chain;
        },
    };
    const supabase = {
        getAdminClient: () => ({ from: () => chain }),
    };
    const svc = new StudioUmkmService(
        supabase as any,
        {} as any,
        {} as any,
        { coach: vi.fn() } as any,
    );
    return { svc, getSaved: () => saved };
}

describe('updateUmkmCommands pendampingEnabled', () => {
    it('F7: true/false writes flag', async () => {
        const { svc, getSaved } = makeServiceWithConfig({
            umkm_mode: true,
            umkm_commands: DEFAULT_UMKM_COMMANDS,
        });
        await svc.updateUmkmCommands('nb-1', DEFAULT_UMKM_COMMANDS, true);
        expect(getSaved()?.umkm_pendamping_enabled).toBe(true);
        await svc.updateUmkmCommands('nb-1', DEFAULT_UMKM_COMMANDS, false);
        expect(getSaved()?.umkm_pendamping_enabled).toBe(false);
    });

    it('F9: omit preserves existing flag', async () => {
        const { svc, getSaved } = makeServiceWithConfig({
            umkm_mode: true,
            umkm_pendamping_enabled: false,
            umkm_commands: DEFAULT_UMKM_COMMANDS,
        });
        await svc.updateUmkmCommands('nb-1', DEFAULT_UMKM_COMMANDS);
        expect(getSaved()?.umkm_pendamping_enabled).toBe(false);
    });

    it('F12: null preserves existing flag', async () => {
        const { svc, getSaved } = makeServiceWithConfig({
            umkm_mode: true,
            umkm_pendamping_enabled: false,
            umkm_commands: DEFAULT_UMKM_COMMANDS,
        });
        await svc.updateUmkmCommands('nb-1', DEFAULT_UMKM_COMMANDS, null);
        expect(getSaved()?.umkm_pendamping_enabled).toBe(false);
    });

    it('F13: commands-only save (omit) keeps OFF', async () => {
        const { svc, getSaved } = makeServiceWithConfig({
            umkm_mode: true,
            umkm_pendamping_enabled: false,
            umkm_commands: DEFAULT_UMKM_COMMANDS,
        });
        await svc.updateUmkmCommands('nb-1', {
            ...DEFAULT_UMKM_COMMANDS,
            menu: [...DEFAULT_UMKM_COMMANDS.menu, { digit: '9', intent: 'help', label: 'Extra' }],
        });
        expect(getSaved()?.umkm_pendamping_enabled).toBe(false);
    });
});
