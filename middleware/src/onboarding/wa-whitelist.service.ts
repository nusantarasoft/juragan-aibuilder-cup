import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { StudioWhatsAppService } from '../studio/studio-whatsapp.service';
import {
    collectUmkmOwnerPhones,
    normalizePhoneDigits,
    phonesMatch,
} from '../studio/studio-whatsapp.util';

@Injectable()
export class WaWhitelistService {
    constructor(
        private readonly supabase: SupabaseService,
        private readonly whatsapp: StudioWhatsAppService,
    ) {}

    private admin() {
        return this.supabase.getAdminClient();
    }

    async listForStore(storeId: string) {
        const { data, error } = await this.admin()
            .from('tenant_wa_whitelist')
            .select('id, phone, label, is_owner, created_at')
            .eq('store_id', storeId)
            .order('created_at', { ascending: true });
        if (error) throw new Error(error.message);
        return data ?? [];
    }

    async syncStudioAllowlist(storeId: string): Promise<void> {
        const store = await this.getStore(storeId);
        const rows = await this.listForStore(storeId);
        const owner = rows.find((r) => r.is_owner) ?? rows[0];
        await this.whatsapp.updateConfig(
            {
                allowlistPhones: [],
                businessPhone: owner?.phone ?? null,
            },
            store.studio_slug,
        );
    }

    async addPhone(storeId: string, phoneRaw: string, opts?: { label?: string; isOwner?: boolean }) {
        const phone = normalizePhoneDigits(phoneRaw);
        if (phone.length < 8) throw new Error('Invalid phone number');
        const rows = await this.listForStore(storeId);
        if (rows.length > 0 && !rows.some((r) => normalizePhoneDigits(String(r.phone)) === phone)) {
            throw new BadRequestException(
                'Satu toko hanya boleh punya satu nomor WhatsApp pemilik (D-40).',
            );
        }
        if (!opts?.isOwner && rows.length > 0) {
            throw new BadRequestException(
                'Satu toko hanya boleh punya satu nomor WhatsApp pemilik (D-40).',
            );
        }
        const { data, error } = await this.admin()
            .from('tenant_wa_whitelist')
            .upsert(
                {
                    store_id: storeId,
                    phone,
                    label: opts?.label ?? null,
                    is_owner: opts?.isOwner ?? false,
                },
                { onConflict: 'store_id,phone' },
            )
            .select()
            .single();
        if (error) throw new Error(error.message);
        await this.syncStudioAllowlist(storeId);
        return data;
    }

    async removePhone(storeId: string, phoneRaw: string) {
        const phone = normalizePhoneDigits(phoneRaw);
        const { error } = await this.admin()
            .from('tenant_wa_whitelist')
            .delete()
            .eq('store_id', storeId)
            .eq('phone', phone);
        if (error) throw new Error(error.message);
        await this.syncStudioAllowlist(storeId);
        return true;
    }

    async isPhoneAllowed(studioSlug: string, phoneRaw: string): Promise<boolean> {
        const { data: cfg } = await this.admin()
            .from('studio_whatsapp_config')
            .select('tenant_id,business_phone,allowlist_phones')
            .eq('tenant_id', studioSlug)
            .maybeSingle();
        if (!cfg) return false;
        return collectUmkmOwnerPhones(cfg).some((p) => phonesMatch(p, phoneRaw));
    }

    private async getStore(storeId: string) {
        const { data, error } = await this.admin()
            .from('tenant_stores')
            .select('id, studio_slug, tenant_id')
            .eq('id', storeId)
            .maybeSingle();
        if (error) throw new Error(error.message);
        if (!data) throw new NotFoundException('Store not found');
        return data as { id: string; studio_slug: string; tenant_id: string };
    }
}
