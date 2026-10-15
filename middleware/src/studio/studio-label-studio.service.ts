import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../supabase/supabase.service';
import type {
    StudioLabelStudioDashboard,
    StudioLabelStudioProject,
    StudioLabelStudioRecentAnnotation,
} from './studio-label-studio.types';

type LsProjectRow = {
    id: number;
    title: string;
    color?: string;
    task_number?: number;
    num_tasks_with_annotations?: number;
    total_annotations_number?: number;
    label_config?: string;
};

const PROJECT_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#06b6d4'];

@Injectable()
export class StudioLabelStudioService {
    private readonly logger = new Logger(StudioLabelStudioService.name);

    constructor(
        private readonly config: ConfigService,
        private readonly supabase: SupabaseService,
    ) {}

    async getDashboard(tenantId: string): Promise<StudioLabelStudioDashboard> {
        const lsUrl = (this.config.get<string>('LABELSTUDIO_URL') || '').replace(/\/$/, '');
        const token = this.config.get<string>('LABELSTUDIO_API_TOKEN');
        const browserUrl =
            (this.config.get<string>('LABELSTUDIO_BROWSER_URL') || 'http://localhost:8080').replace(/\/$/, '');

        if (!lsUrl || !token) {
            return {
                configured: false,
                openUrl: browserUrl,
                message: 'Label Studio API is not configured (LABELSTUDIO_URL / LABELSTUDIO_API_TOKEN).',
                projects: [],
                recentAnnotations: [],
            };
        }

        try {
            const projects = await this.fetchProjects(lsUrl, token);
            const projectNames = new Map(projects.map((p) => [p.id, p.name]));
            const recentAnnotations = await this.fetchRecentAnnotations(tenantId, projectNames);
            return {
                configured: true,
                openUrl: browserUrl,
                projects,
                recentAnnotations,
            };
        } catch (e) {
            const msg = e instanceof Error ? e.message : 'Label Studio API request failed';
            this.logger.warn(`Label Studio dashboard for tenant ${tenantId}: ${msg}`);
            return {
                configured: false,
                openUrl: browserUrl,
                message: msg,
                projects: [],
                recentAnnotations: [],
            };
        }
    }

    private async fetchProjects(lsUrl: string, token: string): Promise<StudioLabelStudioProject[]> {
        const res = await fetch(`${lsUrl}/api/projects/`, {
            headers: { Authorization: `Token ${token}`, Accept: 'application/json' },
        });
        if (!res.ok) {
            throw new Error(`Label Studio projects HTTP ${res.status}`);
        }
        const body = (await res.json()) as LsProjectRow[] | { results?: LsProjectRow[] };
        const rows = Array.isArray(body) ? body : (body.results ?? []);
        if (!Array.isArray(rows)) return [];

        return rows.map((p, i) => {
            const tasks = p.task_number ?? 0;
            const completed = p.num_tasks_with_annotations ?? 0;
            const annotators = Math.max(1, p.total_annotations_number ? Math.min(p.total_annotations_number, 99) : 1);
            return {
                id: p.id,
                name: p.title || `Project ${p.id}`,
                projectType: inferProjectType(p.label_config),
                tasks,
                completed,
                annotators,
                color: p.color && p.color !== '#FFFFFF' ? p.color : PROJECT_COLORS[i % PROJECT_COLORS.length],
            };
        });
    }

    private async fetchRecentAnnotations(
        tenantId: string,
        projectNames: Map<number, string>,
    ): Promise<StudioLabelStudioRecentAnnotation[]> {
        const db = this.supabase.getAdminClient();
        const { data: rows, error } = await db
            .from('media_annotations')
            .select(
                `
                id,
                ls_task_id,
                ls_project_id,
                annotations,
                annotated_by,
                updated_at,
                media:media_id ( id, filename, original_name, metadata )
            `,
            )
            .order('updated_at', { ascending: false })
            .limit(40);

        if (error) {
            this.logger.warn(`media_annotations query failed: ${error.message}`);
            return [];
        }

        const out: StudioLabelStudioRecentAnnotation[] = [];

        for (const row of rows ?? []) {
            const media = row.media as
                | { filename?: string; original_name?: string; metadata?: Record<string, unknown> }
                | null
                | undefined;
            const metaTenant = media?.metadata?.tenant_id ?? media?.metadata?.tenantId;
            if (metaTenant && String(metaTenant) !== tenantId) continue;

            const label = extractPrimaryLabel(row.annotations);
            const taskLabel =
                media?.original_name || media?.filename || `Task #${row.ls_task_id}`;
            const projectName =
                projectNames.get(row.ls_project_id) ?? `Project ${row.ls_project_id}`;

            out.push({
                id: String(row.id),
                taskLabel,
                projectName,
                label,
                annotator: row.annotated_by || 'unknown',
                updatedAt: row.updated_at || new Date().toISOString(),
            });
            if (out.length >= 8) break;
        }

        return out;
    }
}

function inferProjectType(labelConfig?: string): string {
    if (!labelConfig) return 'Annotation Project';
    const lc = labelConfig.toLowerCase();
    if (lc.includes('rectanglelabels') || lc.includes('polygonlabels')) return 'Object Detection';
    if (lc.includes('<image') || lc.includes('image')) return 'Image Labeling';
    if (lc.includes('choices') || lc.includes('text')) return 'Text Classification';
    return 'Annotation Project';
}

function extractPrimaryLabel(annotations: unknown): string {
    if (!Array.isArray(annotations) || annotations.length === 0) return '—';
    const first = annotations[0] as { result?: Array<{ value?: Record<string, unknown> }> };
    const results = first?.result;
    if (!Array.isArray(results) || results.length === 0) return '—';
    const value = results[0]?.value;
    if (!value || typeof value !== 'object') return '—';
    if (Array.isArray(value.choices) && value.choices[0]) return String(value.choices[0]);
    if (Array.isArray(value.labels) && value.labels[0]) return String(value.labels[0]);
    if (typeof value.text === 'string' && value.text.trim()) return value.text.trim();
    return '—';
}
