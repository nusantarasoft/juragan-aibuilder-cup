import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class OpsService {
    constructor(private supabaseService: SupabaseService) {}

    private get db() {
        return this.supabaseService.getAdminClient();
    }

    // ─── PLAYBOOKS ──────────────────────────────────────────

    async getPlaybooks(tenantId: string) {
        const { data, error } = await this.db.from('ops_playbooks')
            .select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    }

    async getPlaybook(id: string) {
        const { data, error } = await this.db.from('ops_playbooks')
            .select('*').eq('id', id).single();
        if (error) throw error;
        return data;
    }

    async createPlaybook(tenantId: string, input: {
        name: string; description?: string; category?: string;
        priority?: string; estimatedMinutes?: number; tags?: string[];
        createdBy?: string;
    }) {
        const { data, error } = await this.db.from('ops_playbooks').insert({
            tenant_id: tenantId, name: input.name,
            description: input.description || null,
            category: input.category || 'general',
            priority: input.priority || 'medium',
            estimated_minutes: input.estimatedMinutes || 0,
            tags: input.tags || [],
            created_by: input.createdBy || null,
        }).select().single();
        if (error) throw error;
        return data;
    }

    async updatePlaybook(id: string, input: {
        name?: string; description?: string; category?: string;
        priority?: string; estimatedMinutes?: number; tags?: string[];
        isActive?: boolean;
    }) {
        const updates: any = { updated_at: new Date().toISOString() };
        if (input.name !== undefined) updates.name = input.name;
        if (input.description !== undefined) updates.description = input.description;
        if (input.category !== undefined) updates.category = input.category;
        if (input.priority !== undefined) updates.priority = input.priority;
        if (input.estimatedMinutes !== undefined) updates.estimated_minutes = input.estimatedMinutes;
        if (input.tags !== undefined) updates.tags = input.tags;
        if (input.isActive !== undefined) updates.is_active = input.isActive;
        const { data, error } = await this.db.from('ops_playbooks')
            .update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    async deletePlaybook(id: string): Promise<boolean> {
        const { error } = await this.db.from('ops_playbooks').delete().eq('id', id);
        if (error) throw error;
        return true;
    }

    // ─── PLAYBOOK STEPS ─────────────────────────────────────

    async getPlaybookSteps(playbookId: string) {
        const { data, error } = await this.db.from('ops_playbook_steps')
            .select('*').eq('playbook_id', playbookId).order('step_order');
        if (error) throw error;
        return data;
    }

    async createPlaybookStep(playbookId: string, input: {
        title: string; description?: string; stepOrder?: number;
        stepType?: string; isRequired?: boolean; defaultAssigneeId?: string;
        estimatedMinutes?: number;
    }) {
        const { data, error } = await this.db.from('ops_playbook_steps').insert({
            playbook_id: playbookId, title: input.title,
            description: input.description || null,
            step_order: input.stepOrder || 0,
            step_type: input.stepType || 'task',
            is_required: input.isRequired ?? true,
            default_assignee_id: input.defaultAssigneeId || null,
            estimated_minutes: input.estimatedMinutes || 0,
        }).select().single();
        if (error) throw error;
        return data;
    }

    async updatePlaybookStep(id: string, input: {
        title?: string; description?: string; stepOrder?: number;
        stepType?: string; isRequired?: boolean; defaultAssigneeId?: string;
        estimatedMinutes?: number;
    }) {
        const updates: any = {};
        if (input.title !== undefined) updates.title = input.title;
        if (input.description !== undefined) updates.description = input.description;
        if (input.stepOrder !== undefined) updates.step_order = input.stepOrder;
        if (input.stepType !== undefined) updates.step_type = input.stepType;
        if (input.isRequired !== undefined) updates.is_required = input.isRequired;
        if (input.defaultAssigneeId !== undefined) updates.default_assignee_id = input.defaultAssigneeId;
        if (input.estimatedMinutes !== undefined) updates.estimated_minutes = input.estimatedMinutes;
        const { data, error } = await this.db.from('ops_playbook_steps')
            .update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    async deletePlaybookStep(id: string): Promise<boolean> {
        const { error } = await this.db.from('ops_playbook_steps').delete().eq('id', id);
        if (error) throw error;
        return true;
    }

    // ─── RUNS ───────────────────────────────────────────────

    async getRuns(tenantId: string, status?: string) {
        let query = this.db.from('ops_runs')
            .select('*, ops_playbooks(name, category, priority)')
            .eq('tenant_id', tenantId);
        if (status) query = query.eq('status', status);
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    }

    async getRun(id: string) {
        const { data, error } = await this.db.from('ops_runs')
            .select('*, ops_playbooks(name, category, priority)')
            .eq('id', id).single();
        if (error) throw error;
        return data;
    }

    async createRun(tenantId: string, input: {
        playbookId: string; name: string; startedBy?: string;
        dueAt?: string; notes?: string; scheduleId?: string;
    }) {
        const { data, error } = await this.db.from('ops_runs').insert({
            tenant_id: tenantId, playbook_id: input.playbookId,
            name: input.name, status: 'pending',
            started_by: input.startedBy || null,
            due_at: input.dueAt || null,
            notes: input.notes || null,
            schedule_id: input.scheduleId || null,
        }).select().single();
        if (error) throw error;

        // Auto-create run steps from playbook
        const steps = await this.getPlaybookSteps(input.playbookId);
        for (const step of steps) {
            await this.db.from('ops_run_steps').insert({
                run_id: data.id, step_id: step.id,
                step_order: step.step_order, title: step.title,
                status: 'pending',
                assignee_id: step.default_assignee_id || null,
            });
        }

        return data;
    }

    async updateRunStatus(id: string, status: string) {
        const updates: any = { status, updated_at: new Date().toISOString() };
        if (status === 'in_progress') updates.started_at = new Date().toISOString();
        if (status === 'completed' || status === 'cancelled' || status === 'failed') {
            updates.completed_at = new Date().toISOString();
        }
        const { data, error } = await this.db.from('ops_runs')
            .update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    async deleteRun(id: string): Promise<boolean> {
        const { error } = await this.db.from('ops_runs').delete().eq('id', id);
        if (error) throw error;
        return true;
    }

    // ─── RUN STEPS ──────────────────────────────────────────

    async getRunSteps(runId: string) {
        const { data, error } = await this.db.from('ops_run_steps')
            .select('*').eq('run_id', runId).order('step_order');
        if (error) throw error;
        return data;
    }

    async updateRunStepStatus(id: string, status: string, completedBy?: string, notes?: string) {
        const updates: any = { status };
        if (status === 'in_progress') updates.started_at = new Date().toISOString();
        if (status === 'completed' || status === 'skipped') {
            updates.completed_at = new Date().toISOString();
            updates.completed_by = completedBy || null;
        }
        if (notes !== undefined) updates.notes = notes;
        const { data, error } = await this.db.from('ops_run_steps')
            .update(updates).eq('id', id).select().single();
        if (error) throw error;

        // Auto-complete run if all steps done
        if (status === 'completed' || status === 'skipped') {
            const step = data;
            const allSteps = await this.getRunSteps(step.run_id);
            const allDone = allSteps.every(s => s.status === 'completed' || s.status === 'skipped');
            if (allDone) {
                await this.updateRunStatus(step.run_id, 'completed');
            }
        }

        return data;
    }

    async assignRunStep(id: string, assigneeId: string, assigneeName?: string) {
        const { data, error } = await this.db.from('ops_run_steps')
            .update({ assignee_id: assigneeId, assignee_name: assigneeName || null })
            .eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    // ─── SCHEDULES ──────────────────────────────────────────

    async getSchedules(tenantId: string) {
        const { data, error } = await this.db.from('ops_schedules')
            .select('*, ops_playbooks(name, category)')
            .eq('tenant_id', tenantId).order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    }

    async createSchedule(tenantId: string, input: {
        playbookId: string; name: string; cronExpression: string;
        timezone?: string; autoAssignTo?: string; createdBy?: string;
    }) {
        const { data, error } = await this.db.from('ops_schedules').insert({
            tenant_id: tenantId, playbook_id: input.playbookId,
            name: input.name, cron_expression: input.cronExpression,
            timezone: input.timezone || 'Asia/Jakarta',
            auto_assign_to: input.autoAssignTo || null,
            created_by: input.createdBy || null,
        }).select().single();
        if (error) throw error;
        return data;
    }

    async updateSchedule(id: string, input: {
        name?: string; cronExpression?: string; timezone?: string;
        isActive?: boolean; autoAssignTo?: string;
    }) {
        const updates: any = { updated_at: new Date().toISOString() };
        if (input.name !== undefined) updates.name = input.name;
        if (input.cronExpression !== undefined) updates.cron_expression = input.cronExpression;
        if (input.timezone !== undefined) updates.timezone = input.timezone;
        if (input.isActive !== undefined) updates.is_active = input.isActive;
        if (input.autoAssignTo !== undefined) updates.auto_assign_to = input.autoAssignTo;
        const { data, error } = await this.db.from('ops_schedules')
            .update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    async deleteSchedule(id: string): Promise<boolean> {
        const { error } = await this.db.from('ops_schedules').delete().eq('id', id);
        if (error) throw error;
        return true;
    }
}
