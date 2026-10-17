import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { WA_WHITELIST_MAX_STAFF } from './wa-connection.constants';
import { SupabaseService } from '../supabase/supabase.service';
import { StudioWhatsAppService } from '../studio/studio-whatsapp.service';
import { normalizePhoneDigits } from '../studio/studio-whatsapp.util';

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
        const owner = rows.find((r) => r.is_owner);
        const staff = rows.filter((r) => !r.is_owner).map((r) => r.phone);
        await this.whatsapp.updateConfig(
            {
                allowlistPhones: staff,
                businessPhone: owner?.phone ?? null,
            },
            store.studio_slug,
        );
    }

    async addPhone(storeId: string, phoneRaw: string, opts?: { label?: string; isOwner?: boolean }) {
        const phone = normalizePhoneDigits(phoneRaw);
        if (phone.length < 8) throw new Error('Invalid phone number');
        if (!opts?.isOwner) {
            const rows = await this.listForStore(storeId);
            const staffCount = rows.filter((r) => !r.is_owner).length;
            const exists = rows.some((r) => normalizePhoneDigits(String(r.phone)) === phone);
            if (!exists && staffCount >= WA_WHITELIST_MAX_STAFF) {
                throw new BadRequestException(
                    `Maksimal ${WA_WHITELIST_MAX_STAFF} nomor staff per toko`,
                );
            }
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
        const phone = normalizePhoneDigits(phoneRaw);
        const { data: store } = await this.admin()
            .from('tenant_stores')
            .select('id')
            .eq('studio_slug', studioSlug)
            .maybeSingle();
        if (!store?.id) return false;
        const { data } = await this.admin()
            .from('tenant_wa_whitelist')
            .select('phone')
            .eq('store_id', store.id);
        const list = (data ?? []).map((r) => normalizePhoneDigits(String(r.phone)));
        return list.some((p) => p === phone || p.endsWith(phone) || phone.endsWith(p));
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
