import {
    BadRequestException,
    Inject,
    Injectable,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import {
    WHATSAPP_TRANSPORT,
    WhatsAppTransport,
} from '../whatsapp/whatsapp-transport.types';
import { StudioService } from './studio.service';
import { StudioUmkmService } from './studio-umkm.service';
import { StudioWhatsAppService } from './studio-whatsapp.service';
import { assertNoSupabaseError } from './studio-supabase.util';
import { normalizePhoneDigits } from './studio-whatsapp.util';

export type UmkmRegistrationStatus =
    | 'draft'
    | 'pending'
    | 'approved'
    | 'rejected'
    | 'expired';

export interface StudioUmkmRegistrationRow {
    id: string;
    phone: string;
    store_name: string | null;
    owner_name: string | null;
    status: UmkmRegistrationStatus;
    tenant_id: string | null;
    notebook_id: string | null;
    reject_reason: string | null;
    wizard_step: string | null;
    session_name: string;
    created_at: string;
    updated_at: string;
    expires_at: string;
    approved_at: string | null;
    approved_by: string | null;
}

function slugifyTenant(storeName: string): string {
    const raw = (storeName || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 48);
    return `umkm-${raw || 'toko'}`;
}

@Injectable()
export class StudioUmkmRegistrationService {
    private readonly logger = new Logger(StudioUmkmRegistrationService.name);

    constructor(
        private readonly supabaseService: SupabaseService,
        private readonly studioService: StudioService,
        private readonly studioUmkmService: StudioUmkmService,
        private readonly studioWhatsAppService: StudioWhatsAppService,
        @Inject(WHATSAPP_TRANSPORT) private readonly waTransport: WhatsAppTransport,
    ) {}

    private admin() {
        return this.supabaseService.getAdminClient();
    }

    async listRegistrations(
        status: UmkmRegistrationStatus | 'all' = 'pending',
    ): Promise<StudioUmkmRegistrationRow[]> {
        let q = this.admin()
            .from('studio_umkm_registrations')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100);
        if (status && status !== 'all') {
            q = q.eq('status', status);
        }
        const { data, error } = await q;
        assertNoSupabaseError(error, 'Failed to list UMKM registrations');
        return (data || []) as StudioUmkmRegistrationRow[];
    }

    async getById(id: string): Promise<StudioUmkmRegistrationRow> {
        const { data, error } = await this.admin()
            .from('studio_umkm_registrations')
            .select('*')
            .eq('id', id)
            .maybeSingle();
        assertNoSupabaseError(error, 'Failed to load UMKM registration');
        if (!data) throw new NotFoundException('Registration not found');
        return data as StudioUmkmRegistrationRow;
    }

    /**
     * Approve a pending registration: notebook + UMKM setup + WhatsApp config,
     * then notify the owner on WhatsApp (best-effort).
     */
    async approve(id: string, approvedBy: string): Promise<StudioUmkmRegistrationRow> {
        const row = await this.getById(id);
        if (row.status !== 'pending') {
            throw new BadRequestException(
                `Registration status is ${row.status}; only pending can be approved`,
            );
        }
        const phone = normalizePhoneDigits(row.phone);
        if (phone.length < 8) {
            throw new BadRequestException('Registration phone is invalid');
        }
        const storeName = (row.store_name || '').trim() || 'Toko UMKM';
        let tenantId = slugifyTenant(storeName);

        // Avoid tenant_id collisions by appending short phone suffix.
        const existing = await this.studioWhatsAppService.getConfig(tenantId);
        if (existing) {
            tenantId = `${tenantId}-${phone.slice(-4)}`.slice(0, 64);
        }

        const notebook = await this.studioService.createNotebook(
            storeName,
            'UMKM penjualan via WhatsApp (daftar WA)',
            approvedBy,
            'customer',
        );
        await this.studioUmkmService.setupUmkmNotebook(notebook.id, tenantId);
        await this.studioWhatsAppService.updateConfig(
            {
                notebookId: notebook.id,
                enabled: true,
                allowlistPhones: [phone],
                useGuidedFlow: false,
                // Align with Admin UMKM create form (prod configs use default).
                sessionName: 'default',
                businessPhone: phone,
                label: storeName,
            },
            tenantId,
        );

        const now = new Date().toISOString();
        const { data, error } = await this.admin()
            .from('studio_umkm_registrations')
            .update({
                status: 'approved',
                tenant_id: tenantId,
                notebook_id: notebook.id,
                approved_at: now,
                approved_by: approvedBy,
                updated_at: now,
                wizard_step: 'done',
            })
            .eq('id', id)
            .eq('status', 'pending')
            .select()
            .maybeSingle();
        assertNoSupabaseError(error, 'Failed to mark registration approved');
        if (!data) {
            throw new BadRequestException('Registration was already processed');
        }

        await this.notifyOwner(
            phone,
            `✅ Toko *${storeName}* sudah diaktifkan admin.\nCoba ketik: *cek stok* / *laporan* / *jual 1 [nama barang]*.`,
        );

        return data as StudioUmkmRegistrationRow;
    }

    async reject(
        id: string,
        reason?: string | null,
        rejectedBy?: string,
    ): Promise<StudioUmkmRegistrationRow> {
        const row = await this.getById(id);
        if (row.status !== 'pending' && row.status !== 'draft') {
            throw new BadRequestException(
                `Registration status is ${row.status}; only draft/pending can be rejected`,
            );
        }
        const rejectReason = (reason || '').trim() || null;
        const now = new Date().toISOString();
        const { data, error } = await this.admin()
            .from('studio_umkm_registrations')
            .update({
                status: 'rejected',
                reject_reason: rejectReason,
                updated_at: now,
                wizard_step: 'done',
                ...(rejectedBy ? { approved_by: rejectedBy } : {}),
            })
            .eq('id', id)
            .in('status', ['draft', 'pending'])
            .select()
            .maybeSingle();
        assertNoSupabaseError(error, 'Failed to reject registration');
        if (!data) {
            throw new BadRequestException('Registration was already processed');
        }

        const phone = normalizePhoneDigits(row.phone);
        const msg = rejectReason
            ? `Pendaftaran ditolak: ${rejectReason}\nKetik *DAFTAR* untuk coba lagi.`
            : 'Pendaftaran ditolak admin.\nKetik *DAFTAR* untuk coba lagi.';
        if (phone.length >= 8) {
            await this.notifyOwner(phone, msg);
        }

        return data as StudioUmkmRegistrationRow;
    }

    private async notifyOwner(phone: string, text: string): Promise<void> {
        try {
            const res = await this.waTransport.sendText(phone, text);
            if (!res?.success) {
                this.logger.warn(`UMKM registration WA notify failed for ${phone}: ${res?.error}`);
            }
        } catch (e: any) {
            this.logger.warn(`UMKM registration WA notify error: ${e?.message || e}`);
        }
    }
}
