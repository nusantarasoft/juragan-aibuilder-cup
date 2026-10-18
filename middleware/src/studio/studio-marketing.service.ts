import { randomUUID } from 'crypto';
import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import { SupabaseService } from '../supabase/supabase.service';
import { AiRouterService } from '../ai/ai-router.service';
import { AiSettingsService } from '../ai/ai-settings.service';
import type { StudioSettingsRow } from '../ai/ai-settings.types';
import { parseGoogleServiceAccountJson } from '../ai/google-vertex-auth.util';
import { assertNoSupabaseError } from './studio-supabase.util';
import { normalizeAppRole } from '../auth/app-roles';
import { tryGenerateMarketingBackground } from './studio-marketing-background.util';
import { tryGenerateMarketingProductImage } from './studio-marketing-product-image.util';
import { renderMarketingTemplatePng } from './studio-marketing-template.util';
import {
    type EligibleProductRow,
    type MarketingContentStatus,
    type PublicGalleryItem,
    filterEligibleProducts,
    finalizeMarketingCaptionLlm,
    formatPriceIdr,
    isPublicGalleryRow,
    productHasRealPhoto,
} from './studio-marketing.util';

export type StudioMarketingContentRow = {
    id: string;
    tenant_id: string;
    inv_item_id: string;
    source_media_id: string | null;
    image_s3_key: string;
    image_public_url: string;
    caption: string;
    headline: string;
    price_snapshot: number | null;
    product_name_snapshot: string;
    store_label_snapshot: string;
    category_name_snapshot: string | null;
    status: MarketingContentStatus;
    generated_by: string | null;
    model: string | null;
    reject_reason: string | null;
    reviewer_id: string | null;
    decided_at: string | null;
    published_at: string | null;
    created_at: string;
    updated_at: string;
};

export type MarketingStoreConsentRow = {
    tenant_id: string;
    label: string | null;
    enabled: boolean | null;
    marketing_consent: boolean;
    marketing_consent_at: string | null;
    marketing_consent_by: string | null;
};

@Injectable()
export class StudioMarketingService {
    private readonly logger = new Logger(StudioMarketingService.name);
    private minioClient: Minio.Client;
    private readonly bucket: string;
    private runInProgress = false;

    constructor(
        private readonly supabaseService: SupabaseService,
        private readonly config: ConfigService,
        private readonly aiRouter: AiRouterService,
        private readonly aiSettings: AiSettingsService,
    ) {
        const endpointUrl = this.config.get('S3_ENDPOINT') || 'http://minio:9000';
        let endPoint = 'minio';
        let port = 9000;
        let useSSL = false;
        try {
            const url = new URL(endpointUrl);
            endPoint = url.hostname;
            port = parseInt(url.port || '9000', 10);
            useSSL = url.protocol === 'https:';
        } catch {
            /* defaults */
        }
        this.minioClient = new Minio.Client({
            endPoint,
            port,
            useSSL,
            accessKey: this.config.get('S3_ACCESS_KEY') || 'minioadmin',
            secretKey: this.config.get('S3_SECRET_KEY') || 'minioadmin',
        });
        this.bucket = this.config.get('S3_BUCKET') || 'cms-media';
    }

    private admin() {
        return this.supabaseService.getAdminClient();
    }

    assertSuperAdmin(role?: string | null): void {
        if (normalizeAppRole(role) !== 'super_admin') {
            throw new ForbiddenException(
                'Hanya super admin Nusantarasoft yang dapat mengakses Konten Marketing',
            );
        }
    }

    /** Base URL for public asset links (nginx SITE_URL, explicit override, or relative). */
    resolveMarketingPublicBase(): string {
        const explicit = (this.config.get('STUDIO_MARKETING_PUBLIC_BASE_URL') ?? '')
            .toString()
            .trim();
        if (explicit) return explicit.replace(/\/$/, '');
        for (const key of ['SITE_URL', 'PUBLIC_SITE_URL']) {
            const fallback = (this.config.get(key) ?? '').toString().trim();
            if (fallback) return fallback.replace(/\/$/, '');
        }
        return '';
    }

    publicAssetUrl(contentId: string): string {
        const path = `/public/marketing/assets/${contentId}`;
        const base = this.resolveMarketingPublicBase();
        return base ? `${base}${path}` : path;
    }

    async listContents(
        status: MarketingContentStatus | 'all' = 'pending',
        tenantId?: string | null,
    ): Promise<StudioMarketingContentRow[]> {
        let q = this.admin()
            .from('studio_marketing_contents')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(300);
        if (status && status !== 'all') q = q.eq('status', status);
        if (tenantId?.trim()) q = q.eq('tenant_id', tenantId.trim());
        const { data, error } = await q;
        assertNoSupabaseError(error, 'Failed to list marketing contents');
        return (data || []) as StudioMarketingContentRow[];
    }

    async getById(id: string): Promise<StudioMarketingContentRow> {
        const { data, error } = await this.admin()
            .from('studio_marketing_contents')
            .select('*')
            .eq('id', id)
            .maybeSingle();
        assertNoSupabaseError(error, 'Failed to load marketing content');
        if (!data) throw new NotFoundException('Marketing content not found');
        return data as StudioMarketingContentRow;
    }

    async updateCaption(id: string, caption: string, headline?: string): Promise<StudioMarketingContentRow> {
        const patch: Record<string, unknown> = {
            caption: caption.trim().slice(0, 2200),
            updated_at: new Date().toISOString(),
        };
        if (headline !== undefined) patch.headline = headline.trim().slice(0, 200);
        const { data, error } = await this.admin()
            .from('studio_marketing_contents')
            .update(patch)
            .eq('id', id)
            .select('*')
            .single();
        assertNoSupabaseError(error, 'Failed to update caption');
        return data as StudioMarketingContentRow;
    }

    async approve(id: string, reviewerId: string): Promise<StudioMarketingContentRow> {
        const row = await this.getById(id);
        if (row.status !== 'pending' && row.status !== 'unpublished') {
            throw new BadRequestException('Hanya konten pending/unpublished yang bisa di-approve');
        }
        await this.assertStoreConsented(row.tenant_id);
        const now = new Date().toISOString();
        const { data, error } = await this.admin()
            .from('studio_marketing_contents')
            .update({
                status: 'approved',
                reviewer_id: reviewerId,
                decided_at: now,
                published_at: now,
                reject_reason: null,
                updated_at: now,
            })
            .eq('id', id)
            .select('*')
            .single();
        assertNoSupabaseError(error, 'Failed to approve marketing content');
        return data as StudioMarketingContentRow;
    }

    async reject(id: string, reviewerId: string, reason?: string): Promise<StudioMarketingContentRow> {
        const row = await this.getById(id);
        if (row.status !== 'pending') {
            throw new BadRequestException('Hanya konten pending yang bisa ditolak');
        }
        const now = new Date().toISOString();
        const { data, error } = await this.admin()
            .from('studio_marketing_contents')
            .update({
                status: 'rejected',
                reviewer_id: reviewerId,
                decided_at: now,
                reject_reason: reason?.slice(0, 500) ?? null,
                updated_at: now,
            })
            .eq('id', id)
            .select('*')
            .single();
        assertNoSupabaseError(error, 'Failed to reject marketing content');
        return data as StudioMarketingContentRow;
    }

    async unpublish(id: string, reviewerId: string): Promise<StudioMarketingContentRow> {
        const row = await this.getById(id);
        if (row.status !== 'approved') {
            throw new BadRequestException('Hanya konten approved yang bisa di-unpublish');
        }
        const now = new Date().toISOString();
        const { data, error } = await this.admin()
            .from('studio_marketing_contents')
            .update({
                status: 'unpublished',
                reviewer_id: reviewerId,
                decided_at: now,
                updated_at: now,
            })
            .eq('id', id)
            .select('*')
            .single();
        assertNoSupabaseError(error, 'Failed to unpublish marketing content');
        return data as StudioMarketingContentRow;
    }

    async listStoresWithConsent(): Promise<MarketingStoreConsentRow[]> {
        const { data, error } = await this.admin()
            .from('studio_whatsapp_config')
            .select(
                'tenant_id, label, enabled, marketing_consent, marketing_consent_at, marketing_consent_by',
            )
            .order('tenant_id');
        assertNoSupabaseError(error, 'Failed to list store consent');
        return (data || []) as MarketingStoreConsentRow[];
    }

    async setStoreConsent(
        tenantId: string,
        consent: boolean,
        adminUserId: string,
    ): Promise<MarketingStoreConsentRow> {
        const now = new Date().toISOString();
        const { data, error } = await this.admin()
            .from('studio_whatsapp_config')
            .update({
                marketing_consent: consent,
                marketing_consent_at: now,
                marketing_consent_by: adminUserId,
            })
            .eq('tenant_id', tenantId)
            .select(
                'tenant_id, label, enabled, marketing_consent, marketing_consent_at, marketing_consent_by',
            )
            .maybeSingle();
        assertNoSupabaseError(error, 'Failed to update marketing consent');
        if (!data) throw new NotFoundException('Store config not found');
        return data as MarketingStoreConsentRow;
    }

    async generateNow(params: {
        store?: string | null;
        productId?: string | null;
        limit?: number | null;
        triggeredBy?: string | null;
    }): Promise<{ created: number; skipped: number; errors: number }> {
        if (this.runInProgress) {
            throw new BadRequestException('Generasi marketing masih berjalan.');
        }
        this.runInProgress = true;
        try {
            return await this.executeGeneration(params);
        } finally {
            this.runInProgress = false;
        }
    }

    async runMarketingCron(): Promise<void> {
        if (this.runInProgress) {
            this.logger.warn('Skipping marketing cron — run in progress');
            return;
        }
        this.runInProgress = true;
        try {
            await this.executeGeneration({ limit: 20, triggeredBy: null });
        } catch (e: any) {
            this.logger.error(`Marketing cron failed: ${e?.message}`, e?.stack);
        } finally {
            this.runInProgress = false;
        }
    }

    private async executeGeneration(params: {
        store?: string | null;
        productId?: string | null;
        limit?: number | null;
        triggeredBy?: string | null;
    }): Promise<{ created: number; skipped: number; errors: number }> {
        const limit = Math.min(Math.max(Number(params.limit ?? 10) || 10, 1), 50);
        const candidates = await this.loadEligibleProducts(params.store, params.productId);
        const eligible = filterEligibleProducts(candidates, {
            allowAiProductImage: this.isAiProductImageEnabled(),
        }).slice(0, limit);

        let created = 0;
        let skipped = 0;
        let errors = 0;

        for (const product of eligible) {
            try {
                const dup = await this.hasRecentPendingOrApproved(product.item_id);
                if (dup) {
                    skipped += 1;
                    continue;
                }
                await this.generateOne(product, params.triggeredBy ?? 'manual');
                created += 1;
            } catch (e: any) {
                errors += 1;
                this.logger.warn(
                    `Marketing generate failed tenant=${product.tenant_id} item=${product.item_id}: ${e?.message}`,
                );
            }
        }

        return { created, skipped, errors };
    }

    private async hasRecentPendingOrApproved(itemId: string): Promise<boolean> {
        const { data } = await this.admin()
            .from('studio_marketing_contents')
            .select('id')
            .eq('inv_item_id', itemId)
            .in('status', ['pending', 'approved'])
            .limit(1);
        return (data?.length ?? 0) > 0;
    }

    async loadEligibleProducts(
        store?: string | null,
        productId?: string | null,
    ): Promise<EligibleProductRow[]> {
        const { data: configs, error: cfgErr } = await this.admin()
            .from('studio_whatsapp_config')
            .select('tenant_id, label, marketing_consent, enabled');
        assertNoSupabaseError(cfgErr, 'Failed to load whatsapp config');
        const configByTenant = new Map(
            (configs ?? []).map((c: any) => [c.tenant_id as string, c]),
        );

        let itemQuery = this.admin()
            .from('inv_items')
            .select('id, tenant_id, name, selling_price, media_ids, category_id, status')
            .eq('status', 'active');
        if (store?.trim()) itemQuery = itemQuery.eq('tenant_id', store.trim());
        if (productId?.trim()) itemQuery = itemQuery.eq('id', productId.trim());

        const { data: items, error: itemErr } = await itemQuery.limit(500);
        assertNoSupabaseError(itemErr, 'Failed to load inventory items');

        const categoryIds = [
            ...new Set(
                (items ?? [])
                    .map((i: any) => i.category_id)
                    .filter((id: string | null) => id),
            ),
        ];
        const categoryMap = new Map<string, string>();
        if (categoryIds.length > 0) {
            const { data: cats } = await this.admin()
                .from('inv_categories')
                .select('id, name')
                .in('id', categoryIds);
            for (const c of cats ?? []) {
                categoryMap.set(c.id, c.name);
            }
        }

        const rows: EligibleProductRow[] = [];
        for (const item of items ?? []) {
            const cfg = configByTenant.get(item.tenant_id);
            if (!cfg) continue;
            const hasPhoto = productHasRealPhoto(item.media_ids);
            const mediaId = hasPhoto ? (item.media_ids as string[])[0] : null;
            if (!hasPhoto && !this.isAiProductImageEnabled()) continue;
            rows.push({
                tenant_id: item.tenant_id,
                item_id: item.id,
                product_name: item.name,
                selling_price: item.selling_price,
                media_id: mediaId,
                store_label: cfg.label || item.tenant_id,
                category_name: item.category_id ? categoryMap.get(item.category_id) ?? null : null,
                marketing_consent: cfg.marketing_consent === true,
            });
        }
        return rows;
    }

    private isAiProductImageEnabled(): boolean {
        return (
            (this.config.get('STUDIO_MARKETING_AI_PRODUCT_IMAGE') ?? 'true')
                .toString()
                .toLowerCase() !== 'false'
        );
    }

    /** Gemini API key from settings; Vertex project/SA from settings, SA JSON, or GOOGLE_PROJECT_ID env. */
    private marketingImageGenParams(settings: StudioSettingsRow) {
        const fromSa = parseGoogleServiceAccountJson(settings.google_service_account_json)?.project_id;
        const projectId =
            settings.google_project_id?.trim() ||
            this.config.get('GOOGLE_PROJECT_ID')?.toString().trim() ||
            fromSa?.trim() ||
            '';
        return {
            projectId,
            location: settings.google_location ?? 'us-central1',
            serviceAccountJson: settings.google_service_account_json,
            apiKey: settings.google_api_key,
        };
    }

    private async resolveProductPhoto(
        product: EligibleProductRow,
        settings: StudioSettingsRow,
    ): Promise<Buffer> {
        if (product.media_id?.trim()) {
            return this.loadMediaBuffer(product.media_id);
        }
        if (!this.isAiProductImageEnabled()) {
            throw new BadRequestException('Produk tidak punya foto — upload di Inventory atau aktifkan AI product image');
        }
        const generated = await tryGenerateMarketingProductImage({
            ...this.marketingImageGenParams(settings),
            productName: product.product_name,
            categoryName: product.category_name,
            storeLabel: product.store_label,
        });
        if (!generated?.length) {
            throw new BadRequestException(
                'Gagal generate foto produk AI. Aktifkan billing Nano Banana di Google AI Studio (API key), atau lengkapi Vertex (Google project + service account JSON) di AI Studio Settings.',
            );
        }
        return generated;
    }

    private async generateOne(product: EligibleProductRow, triggeredBy: string): Promise<void> {
        if (!product.marketing_consent) {
            throw new BadRequestException('Store belum consent marketing');
        }
        const settings = await this.aiSettings.getRawSettings();
        const photo = await this.resolveProductPhoto(product, settings);
        let background: Buffer | null = null;
        const aiBg =
            (this.config.get('STUDIO_MARKETING_AI_BACKGROUND') ?? 'false').toString().toLowerCase() ===
            'true';
        if (aiBg) {
            background = await tryGenerateMarketingBackground(this.marketingImageGenParams(settings));
        }

        const png = await renderMarketingTemplatePng({
            productName: product.product_name,
            priceIdr: product.selling_price,
            storeLabel: product.store_label,
            productPhoto: photo,
            background,
        });

        const captionPayload = await this.generateCaption(product);
        const provider = await this.aiSettings.getLlmProvider();
        const model = settings?.[`${provider}_model`] ?? provider;

        const contentId = randomUUID();
        const s3Key = `studio/marketing/${product.tenant_id}/${contentId}.png`;
        await this.minioClient.putObject(this.bucket, s3Key, png, png.length, {
            'Content-Type': 'image/png',
        });

        const publicUrl = this.publicAssetUrl(contentId);
        const now = new Date().toISOString();

        const { error } = await this.admin().from('studio_marketing_contents').insert({
            id: contentId,
            tenant_id: product.tenant_id,
            inv_item_id: product.item_id,
            source_media_id: product.media_id?.trim() || null,
            image_s3_key: s3Key,
            image_public_url: publicUrl,
            caption: captionPayload.caption,
            headline: captionPayload.headline,
            price_snapshot: product.selling_price,
            product_name_snapshot: product.product_name,
            store_label_snapshot: product.store_label,
            category_name_snapshot: product.category_name,
            status: 'pending',
            generated_by: triggeredBy,
            model: String(model),
            created_at: now,
            updated_at: now,
        });
        assertNoSupabaseError(error, 'Failed to insert marketing content');
    }

    private async generateCaption(product: EligibleProductRow) {
        const priceText = formatPriceIdr(product.selling_price);
        const prompt = `Anda copywriter untuk promosi warung UMKM di Indonesia.
Buat caption Instagram singkat (Bahasa Indonesia) dan headline pendek untuk kartu produk.
Aturan KETAT:
- Jangan mengarang diskon, promo, atau klaim kesehatan.
- Harga yang disebut harus persis: ${priceText}.
- Ajak pembaca mengunjungi warung "${product.store_label}" (CTA ramah).
- Produk: ${product.product_name}.
Output HANYA JSON valid:
{"headline":"...","caption":"..."}`;

        const raw = await this.aiRouter.generateText(prompt);
        return finalizeMarketingCaptionLlm(raw);
    }

    private async loadMediaBuffer(mediaId: string): Promise<Buffer> {
        const { data, error } = await this.admin()
            .from('media')
            .select('id, s3_key, bucket_name, url, mime_type')
            .eq('id', mediaId)
            .maybeSingle();
        assertNoSupabaseError(error, 'Failed to load media');
        if (!data?.s3_key) {
            if (data?.url) {
                const res = await fetch(data.url);
                if (!res.ok) throw new BadRequestException('Foto produk tidak dapat diunduh');
                return Buffer.from(await res.arrayBuffer());
            }
            throw new BadRequestException('Produk tidak punya foto media valid');
        }
        const bucket = data.bucket_name || this.bucket;
        return this.getObjectBuffer(bucket, data.s3_key);
    }

    private getObjectBuffer(bucket: string, key: string): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            const chunks: Buffer[] = [];
            (this.minioClient as any).getObject(bucket, key, (err: Error | null, stream: NodeJS.ReadableStream) => {
                if (err) return reject(err);
                stream.on('data', (c: Buffer) => chunks.push(c));
                stream.on('end', () => resolve(Buffer.concat(chunks)));
                stream.on('error', reject);
            });
        });
    }

    async getPublicAssetPng(contentId: string): Promise<Buffer> {
        await this.getPublicGalleryItem(contentId);
        const row = await this.getById(contentId);
        return this.getObjectBuffer(this.bucket, row.image_s3_key);
    }

    private async assertStoreConsented(tenantId: string): Promise<void> {
        const { data } = await this.admin()
            .from('studio_whatsapp_config')
            .select('marketing_consent')
            .eq('tenant_id', tenantId)
            .maybeSingle();
        if (!data?.marketing_consent) {
            throw new BadRequestException('Store belum consent marketing — tidak bisa publish');
        }
    }

    async listPublicGallery(params: {
        store?: string;
        category?: string;
        page?: number;
        limit?: number;
    }): Promise<{ items: PublicGalleryItem[]; page: number; limit: number; total: number }> {
        const page = Math.max(Number(params.page ?? 1) || 1, 1);
        const limit = Math.min(Math.max(Number(params.limit ?? 24) || 24, 1), 60);
        const from = (page - 1) * limit;
        const to = from + limit - 1;

        const { data: consented } = await this.admin()
            .from('studio_whatsapp_config')
            .select('tenant_id')
            .eq('marketing_consent', true);
        const tenantIds = (consented ?? []).map((r: { tenant_id: string }) => r.tenant_id);
        if (tenantIds.length === 0) {
            return { items: [], page, limit, total: 0 };
        }

        let q = this.admin()
            .from('studio_marketing_contents')
            .select('*', { count: 'exact' })
            .eq('status', 'approved')
            .in('tenant_id', tenantIds)
            .order('published_at', { ascending: false });
        if (params.store?.trim()) q = q.eq('tenant_id', params.store.trim());
        if (params.category?.trim()) {
            q = q.ilike('category_name_snapshot', params.category.trim());
        }
        const { data, error, count } = await q.range(from, to);
        assertNoSupabaseError(error, 'Failed to list public gallery');

        const items: PublicGalleryItem[] = (data ?? []).map((row: StudioMarketingContentRow) =>
            this.toPublicItem(row),
        );
        return { items, page, limit, total: count ?? items.length };
    }

    async getPublicGalleryItem(id: string): Promise<PublicGalleryItem> {
        const row = await this.getById(id);
        const { data: cfg } = await this.admin()
            .from('studio_whatsapp_config')
            .select('marketing_consent')
            .eq('tenant_id', row.tenant_id)
            .maybeSingle();
        if (!isPublicGalleryRow({ status: row.status, marketing_consent: cfg?.marketing_consent })) {
            throw new NotFoundException('Konten tidak tersedia');
        }
        return this.toPublicItem(row);
    }

    toPublicItem(row: StudioMarketingContentRow): PublicGalleryItem {
        return {
            id: row.id,
            imageUrl: row.image_public_url,
            caption: row.caption,
            headline: row.headline,
            productName: row.product_name_snapshot,
            price: formatPriceIdr(row.price_snapshot),
            storeLabel: row.store_label_snapshot,
            category: row.category_name_snapshot,
            publishedAt: row.published_at,
        };
    }
}
