import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class FormsService {
    private readonly logger = new Logger(FormsService.name);

    constructor(private supabaseService: SupabaseService) { }

    private get db() {
        return this.supabaseService.getAdminClient();
    }

    // ─── TEMPLATES ──────────────────────────────────────────

    async getTemplates(tenantId: string, filters?: {
        category?: string; status?: string; search?: string;
    }) {
        let query = this.db.from('form_templates').select('*, form_fields(id)').eq('tenant_id', tenantId);
        if (filters?.category) query = query.eq('category', filters.category);
        if (filters?.status) query = query.eq('status', filters.status);
        if (filters?.search) query = query.ilike('name', `%${filters.search}%`);
        const { data, error } = await query.order('updated_at', { ascending: false });
        if (error) throw error;
        return (data || []).map((t: any) => ({ ...t, field_count: t.form_fields?.length || 0 }));
    }

    async getTemplate(id: string) {
        const { data, error } = await this.db.from('form_templates')
            .select('*, form_fields(*)')
            .eq('id', id).single();
        if (error) throw error;
        return data;
    }

    async createTemplate(tenantId: string, input: {
        name: string; description?: string; category?: string;
        status?: string; settings?: any; scoringConfig?: any;
        styleConfig?: any; tags?: string[];
    }) {
        const { data, error } = await this.db.from('form_templates').insert({
            tenant_id: tenantId,
            name: input.name,
            description: input.description || null,
            category: input.category || 'custom',
            status: input.status || 'draft',
            settings: input.settings || { allow_edit: true, anonymous: false, one_per_user: false, show_progress: true },
            scoring_config: input.scoringConfig || {},
            style_config: input.styleConfig || {},
            tags: input.tags || [],
        }).select().single();
        if (error) throw error;
        return data;
    }

    async updateTemplate(id: string, input: {
        name?: string; description?: string; category?: string;
        status?: string; settings?: any; scoringConfig?: any;
        styleConfig?: any; tags?: string[];
    }) {
        const updates: any = { updated_at: new Date().toISOString() };
        const fieldMap: Record<string, string> = {
            name: 'name', description: 'description', category: 'category',
            status: 'status', settings: 'settings', scoringConfig: 'scoring_config',
            styleConfig: 'style_config', tags: 'tags',
        };
        for (const [key, col] of Object.entries(fieldMap)) {
            if ((input as any)[key] !== undefined) updates[col] = (input as any)[key];
        }
        const { data, error } = await this.db.from('form_templates').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    async deleteTemplate(id: string): Promise<boolean> {
        const { error } = await this.db.from('form_templates').delete().eq('id', id);
        if (error) throw error;
        return true;
    }

    async duplicateTemplate(id: string, tenantId: string) {
        const original = await this.getTemplate(id);
        if (!original) throw new Error('Template not found');
        const { data: copy, error } = await this.db.from('form_templates').insert({
            tenant_id: tenantId,
            name: `${original.name} (Copy)`,
            description: original.description,
            category: original.category,
            status: 'draft',
            settings: original.settings,
            scoring_config: original.scoring_config,
            style_config: original.style_config,
            tags: original.tags,
            version: 1,
        }).select().single();
        if (error) throw error;
        // Copy fields
        if (original.form_fields?.length) {
            const fields = original.form_fields.map((f: any) => ({
                template_id: copy.id,
                section_id: f.section_id,
                section_title: f.section_title,
                field_type: f.field_type,
                label: f.label,
                description: f.description,
                placeholder: f.placeholder,
                is_required: f.is_required,
                sort_order: f.sort_order,
                options: f.options,
                validation: f.validation,
                kpi_config: f.kpi_config,
                conditional: f.conditional,
                default_value: f.default_value,
                metadata: f.metadata,
            }));
            await this.db.from('form_fields').insert(fields);
        }
        return copy;
    }

    async publishTemplate(id: string) {
        const { data, error } = await this.db.from('form_templates').update({
            status: 'published', updated_at: new Date().toISOString(),
        }).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    // ─── FIELDS ─────────────────────────────────────────────

    async getFields(templateId: string) {
        const { data, error } = await this.db.from('form_fields')
            .select('*').eq('template_id', templateId)
            .order('sort_order');
        if (error) throw error;
        return data;
    }

    async saveFields(templateId: string, fields: {
        id?: string; fieldType: string; label: string; description?: string;
        placeholder?: string; isRequired?: boolean; sortOrder?: number;
        options?: any; validation?: any; kpiConfig?: any; conditional?: any;
        defaultValue?: string; metadata?: any; sectionId?: string; sectionTitle?: string;
    }[]) {
        // Get existing field IDs
        const { data: existing } = await this.db.from('form_fields')
            .select('id').eq('template_id', templateId);
        const existingIds = new Set((existing || []).map((f: any) => f.id));
        const incomingIds = new Set(fields.filter(f => f.id).map(f => f.id));
        // Delete removed fields
        const toDelete = [...existingIds].filter(id => !incomingIds.has(id));
        if (toDelete.length) {
            await this.db.from('form_fields').delete().in('id', toDelete);
        }
        // Upsert fields
        const upsertData = fields.map((f, idx) => ({
            ...(f.id ? { id: f.id } : {}),
            template_id: templateId,
            field_type: f.fieldType,
            label: f.label,
            description: f.description || null,
            placeholder: f.placeholder || null,
            is_required: f.isRequired ?? false,
            sort_order: f.sortOrder ?? idx,
            options: f.options || [],
            validation: f.validation || {},
            kpi_config: f.kpiConfig || {},
            conditional: f.conditional || {},
            default_value: f.defaultValue || null,
            metadata: f.metadata || {},
            section_id: f.sectionId || null,
            section_title: f.sectionTitle || null,
            updated_at: new Date().toISOString(),
        }));
        const toUpdate = upsertData.filter((f: any) => f.id);
        const toInsert = upsertData.filter((f: any) => !f.id);
        for (const field of toUpdate) {
            const { id, ...rest } = field as any;
            await this.db.from('form_fields').update(rest).eq('id', id);
        }
        if (toInsert.length) {
            await this.db.from('form_fields').insert(toInsert);
        }
        return this.getFields(templateId);
    }

    // ─── ASSIGNMENTS ────────────────────────────────────────

    async assignForm(tenantId: string, templateId: string, assignees: {
        assigneeType: string; assigneeId?: string; dueDate?: string;
    }[], assignedBy?: string) {
        const rows = assignees.map(a => ({
            tenant_id: tenantId,
            template_id: templateId,
            assignee_type: a.assigneeType,
            assignee_id: a.assigneeId || null,
            assigned_by: assignedBy || null,
            due_date: a.dueDate || null,
        }));
        const { data, error } = await this.db.from('form_assignments').insert(rows).select();
        if (error) throw error;
        return data;
    }

    async getAssignments(templateId: string) {
        const { data, error } = await this.db.from('form_assignments')
            .select('*').eq('template_id', templateId)
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    }

    async updateAssignment(id: string, input: { status?: string; reminderSent?: boolean }) {
        const updates: any = { updated_at: new Date().toISOString() };
        if (input.status !== undefined) updates.status = input.status;
        if (input.reminderSent !== undefined) updates.reminder_sent = input.reminderSent;
        const { data, error } = await this.db.from('form_assignments').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    // ─── SUBMISSIONS ────────────────────────────────────────

    async getSubmissions(tenantId: string, filters?: {
        templateId?: string; status?: string; submittedBy?: string;
    }) {
        let query = this.db.from('form_submissions')
            .select('*, form_templates(name, category)')
            .eq('tenant_id', tenantId);
        if (filters?.templateId) query = query.eq('template_id', filters.templateId);
        if (filters?.status) query = query.eq('status', filters.status);
        if (filters?.submittedBy) query = query.eq('submitted_by', filters.submittedBy);
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    }

    async getSubmission(id: string) {
        const { data, error } = await this.db.from('form_submissions')
            .select('*, form_templates(name, category, scoring_config), form_field_values(*, form_fields(label, field_type, kpi_config, options))')
            .eq('id', id).single();
        if (error) throw error;
        return data;
    }

    async createSubmission(tenantId: string, input: {
        templateId: string; submittedBy?: string; assignmentId?: string;
        values: { fieldId: string; value?: string; numericValue?: number; jsonValue?: any }[];
    }) {
        const { data: submission, error } = await this.db.from('form_submissions').insert({
            tenant_id: tenantId,
            template_id: input.templateId,
            submitted_by: input.submittedBy || null,
            assignment_id: input.assignmentId || null,
            status: 'submitted',
            submitted_at: new Date().toISOString(),
        }).select().single();
        if (error) throw error;
        // Insert field values
        if (input.values?.length) {
            const vals = input.values.map(v => ({
                submission_id: submission.id,
                field_id: v.fieldId,
                value: v.value || null,
                numeric_value: v.numericValue ?? null,
                json_value: v.jsonValue || {},
            }));
            await this.db.from('form_field_values').insert(vals);
        }
        // Update assignment status if linked
        if (input.assignmentId) {
            await this.db.from('form_assignments').update({
                status: 'completed', updated_at: new Date().toISOString(),
            }).eq('id', input.assignmentId);
        }
        return submission;
    }

    async deleteSubmission(id: string): Promise<boolean> {
        const { error } = await this.db.from('form_submissions').delete().eq('id', id);
        if (error) throw error;
        return true;
    }

    async reviewSubmission(id: string, input: {
        status: string; reviewerId: string; notes?: string;
    }) {
        const { data, error } = await this.db.from('form_submissions').update({
            status: input.status,
            reviewer_id: input.reviewerId,
            reviewer_notes: input.notes || null,
            reviewed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        }).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    // ─── SCORING ENGINE ─────────────────────────────────────

    async calculateScore(submissionId: string) {
        // 1. Get submission with template and field values
        const sub = await this.getSubmission(submissionId);
        if (!sub) throw new Error('Submission not found');
        const scoringConfig = sub.form_templates?.scoring_config || {};
        const maxScore = scoringConfig.max_score || 5;
        const gradingScale = scoringConfig.grading_scale || [];
        const fieldValues = sub.form_field_values || [];
        let totalWeightedScore = 0;
        let totalWeight = 0;
        const dimensionScores: Record<string, { score: number; maxScore: number; weight: number }> = {};
        // 2. Calculate per-field scores
        for (const fv of fieldValues) {
            const field = fv.form_fields;
            if (!field?.kpi_config?.weight) continue;
            const kpi = field.kpi_config;
            const weight = kpi.weight / 100;
            const fieldMaxScore = kpi.max_score || maxScore;
            const rawValue = fv.numeric_value || parseFloat(fv.value) || 0;
            const normalizedScore = Math.min(rawValue / fieldMaxScore, 1) * maxScore;
            const weightedScore = normalizedScore * weight;
            totalWeightedScore += weightedScore;
            totalWeight += weight;
            // Update field value scores
            await this.db.from('form_field_values').update({
                score: rawValue, max_score: fieldMaxScore,
            }).eq('id', fv.id);
            // Aggregate by dimension
            const dim = kpi.dimension || 'General';
            if (!dimensionScores[dim]) dimensionScores[dim] = { score: 0, maxScore: 0, weight: 0 };
            dimensionScores[dim].score += rawValue;
            dimensionScores[dim].maxScore += fieldMaxScore;
            dimensionScores[dim].weight += weight;
        }
        // 3. Calculate final score
        const finalScore = totalWeight > 0 ? totalWeightedScore / totalWeight * (totalWeight) : 0;
        const percentage = totalWeight > 0 ? (totalWeightedScore / (maxScore * totalWeight)) * 100 : 0;
        // 4. Determine grade
        let grade = '';
        const normalizedFinal = totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
        for (const g of gradingScale) {
            if (normalizedFinal >= g.min && normalizedFinal <= g.max) {
                grade = g.label; break;
            }
        }
        // 5. Update submission
        await this.db.from('form_submissions').update({
            total_score: parseFloat(normalizedFinal.toFixed(2)),
            max_possible_score: maxScore,
            percentage: parseFloat(percentage.toFixed(2)),
            grade: grade || null,
            updated_at: new Date().toISOString(),
        }).eq('id', submissionId);
        // 6. Upsert dimension scores
        await this.db.from('form_scores').delete().eq('submission_id', submissionId);
        const scoreRows = Object.entries(dimensionScores).map(([dim, s]) => ({
            tenant_id: sub.tenant_id,
            submission_id: submissionId,
            dimension: dim,
            score: parseFloat((s.score / (s.maxScore || 1) * maxScore).toFixed(2)),
            max_score: maxScore,
            weight: parseFloat(s.weight.toFixed(2)),
            weighted_score: parseFloat((s.score / (s.maxScore || 1) * maxScore * s.weight).toFixed(2)),
        }));
        if (scoreRows.length) await this.db.from('form_scores').insert(scoreRows);
        return this.getSubmission(submissionId);
    }

    async getScores(submissionId: string) {
        const { data, error } = await this.db.from('form_scores')
            .select('*').eq('submission_id', submissionId);
        if (error) throw error;
        return data;
    }

    // ─── ANALYTICS ──────────────────────────────────────────

    async getAnalytics(templateId: string, tenantId: string) {
        const { data: submissions } = await this.db.from('form_submissions')
            .select('*').eq('template_id', templateId).eq('tenant_id', tenantId);
        const subs = submissions || [];
        const total = subs.length;
        const submitted = subs.filter((s: any) => s.status !== 'draft').length;
        const approved = subs.filter((s: any) => s.status === 'approved').length;
        const scores = subs.filter((s: any) => s.total_score > 0).map((s: any) => s.total_score);
        const avgScore = scores.length ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length : 0;
        const avgPercentage = subs.filter((s: any) => s.percentage > 0).length > 0
            ? subs.reduce((a: number, s: any) => a + (s.percentage || 0), 0) / subs.filter((s: any) => s.percentage > 0).length : 0;
        // Grade distribution
        const gradeDist: Record<string, number> = {};
        subs.forEach((s: any) => { if (s.grade) gradeDist[s.grade] = (gradeDist[s.grade] || 0) + 1; });
        // Status distribution
        const statusDist: Record<string, number> = {};
        subs.forEach((s: any) => statusDist[s.status] = (statusDist[s.status] || 0) + 1);
        return {
            totalSubmissions: total,
            submittedCount: submitted,
            approvedCount: approved,
            averageScore: parseFloat(avgScore.toFixed(2)),
            averagePercentage: parseFloat(avgPercentage.toFixed(2)),
            completionRate: total > 0 ? parseFloat(((submitted / total) * 100).toFixed(1)) : 0,
            gradeDistribution: gradeDist,
            statusDistribution: statusDist,
        };
    }
}
