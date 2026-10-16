import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { AiRouterService } from '../ai/ai-router.service';

@Injectable()
export class PmService {
    private readonly logger = new Logger(PmService.name);

    constructor(
        private supabaseService: SupabaseService,
        private aiRouter: AiRouterService
    ) { }

    private get db() {
        return this.supabaseService.getAdminClient();
    }

    // ─── PROJECTS ────────────────────────────────────────────

    async getProjects(tenantId: string, filters?: { status?: string; search?: string }) {
        let query = this.db.from('pm_projects')
            .select('*')
            .eq('tenant_id', tenantId);

        if (filters?.status) query = query.eq('status', filters.status);
        if (filters?.search) query = query.ilike('name', `%${filters.search}%`);

        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) {
            this.logger.error('Error fetching projects:', error);
            throw error;
        }
        return data;
    }

    async getProject(id: string) {
        const { data, error } = await this.db.from('pm_projects')
            .select('*')
            .eq('id', id).single();
        if (error) {
            this.logger.error(`Error fetching project ${id}:`, error);
            throw error;
        }
        return data;
    }

    async createProject(tenantId: string, input: any) {
        const { data, error } = await this.db.from('pm_projects').insert({
            tenant_id: tenantId,
            name: input.name,
            description: input.description,
            status: input.status || 'planning',
            priority: input.priority || 'medium',
            start_date: input.startDate,
            end_date: input.endDate,
            budget: input.budget,
            owner_id: input.ownerId,
            tags: input.tags || [],
            methodology: input.methodology || 'hybrid',
            pmbok_edition: input.pmbokEdition || 'hybrid',
            pmbok_scope_enabled: input.pmbokScopeEnabled ?? true,
            pmbok_schedule_enabled: input.pmbokScheduleEnabled ?? true,
            pmbok_cost_enabled: input.pmbokCostEnabled ?? true,
            pmbok_quality_enabled: input.pmbokQualityEnabled ?? true,
            pmbok_resource_enabled: input.pmbokResourceEnabled ?? true,
            pmbok_comms_enabled: input.pmbokCommsEnabled ?? true,
            pmbok_risk_enabled: input.pmbokRiskEnabled ?? true,
            pmbok_procurement_enabled: input.pmbokProcurementEnabled ?? true,
            pmbok_stakeholder_enabled: input.pmbokStakeholderEnabled ?? true,
        }).select().single();
        if (error) throw error;
        return data;
    }

    async updateProject(id: string, input: any) {
        const updates: any = { updated_at: new Date().toISOString() };
        const fieldMap: Record<string, string> = {
            name: 'name', description: 'description', status: 'status',
            priority: 'priority', startDate: 'start_date', endDate: 'end_date',
            budget: 'budget', spent: 'spent', ownerId: 'owner_id', tags: 'tags',
            methodology: 'methodology', pmbokEdition: 'pmbok_edition',
            pmbokScopeEnabled: 'pmbok_scope_enabled',
            pmbokScheduleEnabled: 'pmbok_schedule_enabled',
            pmbokCostEnabled: 'pmbok_cost_enabled',
            pmbokQualityEnabled: 'pmbok_quality_enabled',
            pmbokResourceEnabled: 'pmbok_resource_enabled',
            pmbokCommsEnabled: 'pmbok_comms_enabled',
            pmbokRiskEnabled: 'pmbok_risk_enabled',
            pmbokProcurementEnabled: 'pmbok_procurement_enabled',
            pmbokStakeholderEnabled: 'pmbok_stakeholder_enabled',
        };
        for (const [key, col] of Object.entries(fieldMap)) {
            if (input[key] !== undefined) updates[col] = input[key];
        }
        const { data, error } = await this.db.from('pm_projects').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    async deleteProject(id: string): Promise<boolean> {
        const { error } = await this.db.from('pm_projects').delete().eq('id', id);
        if (error) throw error;
        return true;
    }

    // ─── SPRINTS ─────────────────────────────────────────────

    async getSprints(projectId: string) {
        const { data, error } = await this.db.from('pm_sprints')
            .select('*')
            .eq('project_id', projectId)
            .order('start_date', { ascending: true });
        if (error) throw error;
        return data;
    }

    async createSprint(tenantId: string, input: any) {
        const { data, error } = await this.db.from('pm_sprints').insert({
            tenant_id: tenantId,
            project_id: input.projectId,
            name: input.name,
            goal: input.goal,
            status: input.status || 'planned',
            start_date: input.startDate,
            end_date: input.endDate
        }).select().single();
        if (error) throw error;
        return data;
    }

    async updateSprint(id: string, input: any) {
        const updates: any = { updated_at: new Date().toISOString() };
        const fieldMap: Record<string, string> = {
            name: 'name', goal: 'goal', status: 'status',
            startDate: 'start_date', endDate: 'end_date'
        };
        for (const [key, col] of Object.entries(fieldMap)) {
            if (input[key] !== undefined) updates[col] = input[key];
        }
        const { data, error } = await this.db.from('pm_sprints').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    async deleteSprint(id: string): Promise<boolean> {
        const { error } = await this.db.from('pm_sprints').delete().eq('id', id);
        if (error) throw error;
        return true;
    }

    // ─── TASKS ───────────────────────────────────────────────

    async getTasks(tenantId: string, filters?: { projectId?: string; sprintId?: string; status?: string; assigneeId?: string }) {
        let query = this.db.from('pm_tasks')
            .select('*')
            .eq('tenant_id', tenantId)
            .eq('is_archived', false);

        if (filters?.projectId) query = query.eq('project_id', filters.projectId);
        if (filters?.sprintId) query = query.eq('sprint_id', filters.sprintId);
        if (filters?.status) query = query.eq('status', filters.status);
        if (filters?.assigneeId) query = query.eq('assignee_id', filters.assigneeId);

        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    }

    async getTask(id: string) {
        const { data, error } = await this.db.from('pm_tasks')
            .select('*')
            .eq('id', id).single();
        if (error) throw error;
        return data;
    }

    async createTask(tenantId: string, input: any) {
        const { data, error } = await this.db.from('pm_tasks').insert({
            tenant_id: tenantId,
            project_id: input.projectId,
            sprint_id: input.sprintId,
            parent_task_id: input.parentTaskId,
            title: input.title,
            description: input.description,
            status: input.status || 'todo',
            priority: input.priority || 'medium',
            type: input.type || 'task',
            assignee_id: input.assigneeId,
            reporter_id: input.reporterId,
            estimated_hours: input.estimatedHours || 0,
            due_date: input.dueDate,
            tags: input.tags || []
        }).select().single();
        if (error) throw error;
        return data;
    }

    async updateTask(id: string, input: any) {
        const updates: any = { updated_at: new Date().toISOString() };
        const fieldMap: Record<string, string> = {
            sprintId: 'sprint_id', parentTaskId: 'parent_task_id', title: 'title',
            description: 'description', status: 'status', priority: 'priority',
            type: 'type', assigneeId: 'assignee_id', estimatedHours: 'estimated_hours',
            dueDate: 'due_date', tags: 'tags', isArchived: 'is_archived'
        };
        for (const [key, col] of Object.entries(fieldMap)) {
            if (input[key] !== undefined) updates[col] = input[key];
        }
        const { data, error } = await this.db.from('pm_tasks').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    async deleteTask(id: string): Promise<boolean> {
        // Soft delete
        const { error } = await this.db.from('pm_tasks').update({ is_archived: true }).eq('id', id);
        if (error) throw error;
        return true;
    }

    // ─── TIME LOGS ───────────────────────────────────────────

    async getTimeLogs(taskId: string) {
        const { data, error } = await this.db.from('pm_time_logs')
            .select('*')
            .eq('task_id', taskId)
            .order('log_date', { ascending: false });
        if (error) throw error;
        return data;
    }

    async logTime(tenantId: string, input: any) {
        // 1. Create log
        const { data: log, error } = await this.db.from('pm_time_logs').insert({
            tenant_id: tenantId,
            task_id: input.taskId,
            user_id: input.userId,
            hours: input.hours,
            log_date: input.logDate,
            description: input.description
        }).select().single();
        if (error) throw error;

        // 2. Update task logged hours
        await this.db.rpc('increment_task_logged_hours', { t_id: input.taskId, hr_amount: input.hours });

        // We will do a generic update instead since rpc might not exist
        const { data: task } = await this.db.from('pm_tasks').select('logged_hours, project_id').eq('id', input.taskId).single();
        if (task) {
            await this.db.from('pm_tasks').update({ logged_hours: Number(task.logged_hours || 0) + Number(input.hours) }).eq('id', input.taskId);
            // Also update project spent (assuming 1 hour = $X, or just storing hours. Let's not auto-update project spent for now unless we know hourly rates)
        }

        return log;
    }

    async deleteTimeLog(id: string): Promise<boolean> {
        const { data: log } = await this.db.from('pm_time_logs').select('task_id, hours').eq('id', id).single();
        if (log) {
            const { error } = await this.db.from('pm_time_logs').delete().eq('id', id);
            if (error) throw error;

            // Decrement
            const { data: task } = await this.db.from('pm_tasks').select('logged_hours').eq('id', log.task_id).single();
            if (task) {
                await this.db.from('pm_tasks').update({ logged_hours: Math.max(0, Number(task.logged_hours || 0) - Number(log.hours)) }).eq('id', log.task_id);
            }
        }
        return true;
    }

    // ─── AI INTEGRATION ────────────────────────────────────────

    async generateTaskDescription(title: string, context?: string): Promise<string> {
        const prompt = `
            You are an expert Project Manager and Business Analyst.
            A user wants to create a new task with the following title:
            "${title}"
            
            ${context ? `Additional Context: ${context}` : ''}
            
            Please write a comprehensive, professional task description. 
            Include:
            1. An objective or summary of what needs to be done.
            2. Proposed Acceptance Criteria (bullet points).
            3. Any logical sub-tasks or implementation notes you recommend.
            
            Format the response purely in clean Markdown, ready to be pasted into a description field. Do not include any meta-greeting like "Here is the description".
        `;

        try {
            const description = await this.aiRouter.generateText(prompt);
            return description;
        } catch (error) {
            this.logger.error("Failed to generate task description via Vertex AI", error);
            return `*AI Description Generation Failed*\n\nPlease manually describe the task: ${title}`;
        }
    }

    async analyzeSprintRisk(sprintId: string): Promise<any> {
        // 1. Fetch Sprint Info
        const { data: sprint } = await this.db.from('pm_sprints').select('*').eq('id', sprintId).single();
        if (!sprint) {
            throw new Error('Sprint not found');
        }

        // 2. Fetch Tasks in Sprint
        const { data: tasks } = await this.db.from('pm_tasks')
            .select('title, status, priority, estimated_hours, logged_hours, due_date')
            .eq('sprint_id', sprintId)
            .eq('is_archived', false);

        const prompt = `
            You are an expert Agile Scrum Master and Delivery Manager.
            Analyze the current state of Sprint "${sprint.name}" (Goal: ${sprint.goal || 'None provided'}).
            Start Date: ${sprint.start_date || 'N/A'}, End Date: ${sprint.end_date || 'N/A'}.

            Here is the raw data of all tasks in the sprint:
            ${JSON.stringify(tasks, null, 2)}

            Analyze the workload, identify any at-risk tasks (e.g., high priority tasks still "todo" near the end date, or tasks where logged hours exceed estimated hours), and provide an overall risk assessment. 
            
            Return ONLY a valid JSON object matching this exact schema:
            {
                "riskLevel": "low" | "medium" | "high" | "critical",
                "riskScore": number (0-100, 100 being guaranteed failure),
                "summary": "A 2-3 sentence executive summary of the sprint health.",
                "identifiedRisks": [
                    { "taskTitle": "...", "reason": "Why is this at risk?" }
                ],
                "recommendations": [ "Actionable advice 1", "Actionable advice 2" ]
            }
        `;

        try {
            const analysis = await this.aiRouter.generateStructuredJSON(prompt);
            return analysis;
        } catch (error) {
            this.logger.error("Failed to analyze sprint risk via Vertex AI", error);
            throw new Error("AI Analysis unavailable at this time.");
        }
    }

    async generateSprintRetrospective(sprintId: string): Promise<string> {
        // 1. Fetch Sprint Info
        const { data: sprint } = await this.db.from('pm_sprints').select('*').eq('id', sprintId).single();
        if (!sprint) {
            throw new Error('Sprint not found');
        }

        // 2. Fetch Tasks in Sprint
        const { data: tasks } = await this.db.from('pm_tasks')
            .select('title, status, priority, estimated_hours, logged_hours')
            .eq('sprint_id', sprintId)
            .eq('is_archived', false);

        const prompt = `
            You are an expert Agile Scrum Master.
            Generate a Sprint Retrospective for Sprint "${sprint.name}" (Goal: ${sprint.goal || 'None provided'}).
            
            Here is the raw data of all tasks in the sprint:
            ${JSON.stringify(tasks, null, 2)}
            
            Based on the completed tasks (status: 'done') vs incomplete tasks, write a professional Agile Retrospective.
            Include:
            1. An executive summary of what went well.
            2. What didn't go well or wasn't finished.
            3. Action items & improvements for the next sprint.
            
            Format the response purely in clean Markdown. Do not include any meta-greeting.
        `;

        try {
            const retrospective = await this.aiRouter.generateText(prompt);
            return retrospective;
        } catch (error) {
            this.logger.error("Failed to generate sprint retrospective via Vertex AI", error);
            return "*AI Retrospective Generation Failed*\n\nPlease manually write the retrospective.";
        }
    }

    async generateProjectCharter(projectId: string): Promise<any> {
        // Fetch Project with all available details
        const { data: project } = await this.db.from('pm_projects').select('*').eq('id', projectId).single();
        if (!project) throw new Error('Project not found');

        const prompt = `
            You are an expert Project Management Professional (PMP).
            Draft a precise Project Charter based on the following project data:
            Name: ${project.name}
            Description: ${project.description || 'N/A'}
            Budget: $${project.budget || 'N/A'}
            Start Date: ${project.start_date || 'N/A'}
            End Date: ${project.end_date || 'N/A'}

            Return ONLY a valid JSON object matching this exact schema:
            {
                "purpose": "A concise paragraph explaining the project justification.",
                "objectives": "Measurable project objectives and success criteria.",
                "highLevelRequirements": "High-level requirements and conditions.",
                "highLevelRisks": "Initial high-level risks identified.",
                "summaryMilestoneSchedule": "Summary description of key milestones.",
                "preapprovedFinancialResources": "Summary of budget and financial constraints.",
                "keyStakeholders": "List of assumed key stakeholders.",
                "projectApprovalRequirements": "What constitutes success and who decides."
            }
        `;

        try {
            const charterJson = await this.aiRouter.generateStructuredJSON(prompt);
            return charterJson;
        } catch (error) {
            this.logger.error("Failed to generate project charter via Vertex AI", error);
            throw new Error("AI Charter generation failed.");
        }
    }

    async generateRiskRegister(projectId: string): Promise<any[]> {
        // Fetch Project
        const { data: project } = await this.db.from('pm_projects').select('*').eq('id', projectId).single();
        if (!project) throw new Error('Project not found');

        const prompt = `
            You are an expert Project Risk Manager.
            Identify 3-5 standard initial risks for the following project:
            Name: ${project.name}
            Description: ${project.description || 'N/A'}

            Return ONLY a valid JSON object with an array matching this exact schema:
            {
                "risks": [
                    {
                        "riskName": "Short title",
                        "description": "Risk description",
                        "category": "Technical | Management | Organizational | External",
                        "probability": number (1-5),
                        "impact": number (1-5),
                        "mitigationStrategy": "How to reduce probability or impact",
                        "contingencyPlan": "What to do if it happens"
                    }
                ]
            }
        `;

        try {
            const response = await this.aiRouter.generateStructuredJSON(prompt);
            return response.risks || [];
        } catch (error) {
            this.logger.error("Failed to generate risk register via Vertex AI", error);
            throw new Error("AI Risk generation failed.");
        }
    }

    // ─── PMBOK 6 MODULES ────────────────────────────────────

    async getProjectCharter(projectId: string) {
        const { data, error } = await this.db.from('pm_project_charters').select('*').eq('project_id', projectId).single();
        if (error && error.code !== 'PGRST116') { // Ignore 0 rows error
            throw error;
        }
        return data; // Might be null
    }

    async upsertProjectCharter(projectId: string, tenantId: string, input: any) {
        const payload = {
            project_id: projectId,
            tenant_id: tenantId,
            purpose: input.purpose,
            objectives: input.objectives,
            high_level_requirements: input.highLevelRequirements,
            high_level_risks: input.highLevelRisks,
            summary_milestone_schedule: input.summaryMilestoneSchedule,
            preapproved_financial_resources: input.preapprovedFinancialResources,
            key_stakeholders: input.keyStakeholders,
            project_approval_requirements: input.projectApprovalRequirements,
            updated_at: new Date().toISOString()
        };

        const { data, error } = await this.db.from('pm_project_charters')
            .upsert(payload, { onConflict: 'project_id' })
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async getRiskRegisters(projectId: string) {
        const { data, error } = await this.db.from('pm_risk_registers')
            .select('*')
            .eq('project_id', projectId)
            .order('risk_score', { ascending: false });
        if (error) throw error;
        return data;
    }

    async createRiskRegister(tenantId: string, input: any) {
        const { data, error } = await this.db.from('pm_risk_registers').insert({
            tenant_id: tenantId,
            project_id: input.projectId,
            risk_name: input.riskName,
            description: input.description,
            category: input.category,
            probability: input.probability,
            impact: input.impact,
            mitigation_strategy: input.mitigationStrategy,
            contingency_plan: input.contingencyPlan,
            status: input.status || 'identified',
            owner_id: input.ownerId
        }).select('*').single();

        if (error) throw error;
        return data;
    }

    async updateRiskRegister(id: string, input: any) {
        const updates: any = { updated_at: new Date().toISOString() };
        const fieldMap: Record<string, string> = {
            riskName: 'risk_name', description: 'description', category: 'category',
            probability: 'probability', impact: 'impact', mitigationStrategy: 'mitigation_strategy',
            contingencyPlan: 'contingency_plan', status: 'status', ownerId: 'owner_id'
        };
        for (const [key, col] of Object.entries(fieldMap)) {
            if (input[key] !== undefined) updates[col] = input[key];
        }

        const { data, error } = await this.db.from('pm_risk_registers')
            .update(updates).eq('id', id).select('*').single();

        if (error) throw error;
        return data;
    }

    async deleteRiskRegister(id: string): Promise<boolean> {
        const { error } = await this.db.from('pm_risk_registers').delete().eq('id', id);
        if (error) throw error;
        return true;
    }

    async getEarnedValues(projectId: string) {
        const { data, error } = await this.db.from('pm_earned_values')
            .select('*')
            .eq('project_id', projectId)
            .order('snapshot_date', { ascending: true });
        if (error) throw error;
        return data;
    }

    async generateEarnedValueMetrics(projectId: string, tenantId: string): Promise<any> {
        // Fetch Project and Tasks
        const { data: project } = await this.db.from('pm_projects').select('id, budget, start_date, end_date').eq('id', projectId).single();
        if (!project) throw new Error('Project not found');

        const { data: tasks } = await this.db.from('pm_tasks')
            .select('status, estimated_hours, logged_hours')
            .eq('project_id', projectId)
            .eq('is_archived', false);

        // AI Prompt for calculation
        // We provide the raw facts, and let the AI deduce the exact PV, EV, AC based on PMBOK rules.
        const prompt = `
            You are an expert PMBOK 6 Project Controller.
            Calculate the Earned Value Management (EVM) metrics for the following project.
            
            Project Budget (BAC): $${project.budget || 0}
            Project Start: ${project.start_date || 'N/A'}
            Project End: ${project.end_date || 'N/A'}
            Current Date: ${new Date().toISOString().split('T')[0]}

            Raw Task Data:
            ${JSON.stringify(tasks || [], null, 2)}

            Instructions:
            1. Assume $50/hour standard blended rate if money isn't explicitly tied to tasks, to calculate Actual Cost (AC) from 'logged_hours'.
            2. Calculate Planned Value (PV) by estimating how much work *should* be done by today based on the project schedule.
            3. Calculate Earned Value (EV) by analyzing the 'estimated_hours' of tasks marked as 'done' and factoring in the $50/hour rate (or proportionate to BAC).
            4. If there is no Budget, use hours as the base currency.
            
            Return ONLY a valid JSON object matching this exact schema:
            {
                "plannedValue": number,
                "earnedValue": number,
                "actualCost": number
            }
        `;

        try {
            const evmJson = await this.aiRouter.generateStructuredJSON(prompt);

            // Save snapshot
            const payload = {
                project_id: projectId,
                tenant_id: tenantId,
                snapshot_date: new Date().toISOString().split('T')[0],
                planned_value: evmJson.plannedValue || 0,
                earned_value: evmJson.earnedValue || 0,
                actual_cost: evmJson.actualCost || 0
            };

            const { data: inserted, error } = await this.db.from('pm_earned_values').insert(payload).select().single();
            if (error) throw error;
            return inserted;

        } catch (error) {
            this.logger.error("Failed to generate EVM metrics via Vertex AI", error);
            throw new Error("AI EVM Calculation failed.");
        }
    }

    // ═══════════════════════════════════════════════════════════
    // ─── SCOPE MANAGEMENT ──────────────────────────────────────
    // ═══════════════════════════════════════════════════════════

    // Scope Statement (one per project)
    async getScopeStatement(projectId: string) {
        const { data, error } = await this.db.from('pm_scope_statements').select('*').eq('project_id', projectId).single();
        if (error && error.code !== 'PGRST116') throw error;
        return data;
    }

    async upsertScopeStatement(projectId: string, tenantId: string, input: any) {
        const payload = {
            project_id: projectId, tenant_id: tenantId,
            project_objectives: input.projectObjectives,
            product_scope_description: input.productScopeDescription,
            deliverables: input.deliverables, acceptance_criteria: input.acceptanceCriteria,
            exclusions: input.exclusions, constraints: input.constraints,
            assumptions: input.assumptions, updated_at: new Date().toISOString()
        };
        const { data, error } = await this.db.from('pm_scope_statements')
            .upsert(payload, { onConflict: 'project_id' }).select().single();
        if (error) throw error;
        return data;
    }

    // WBS Items
    async getWbsItems(projectId: string) {
        const { data, error } = await this.db.from('pm_wbs_items')
            .select('*').eq('project_id', projectId).order('wbs_code', { ascending: true });
        if (error) throw error;
        return data;
    }

    async createWbsItem(tenantId: string, input: any) {
        const { data, error } = await this.db.from('pm_wbs_items').insert({
            tenant_id: tenantId, project_id: input.projectId,
            parent_id: input.parentId, wbs_code: input.wbsCode,
            title: input.title, description: input.description,
            level: input.level || 0, sort_order: input.sortOrder || 0,
            status: input.status || 'pending', assigned_to: input.assignedTo,
            estimated_cost: input.estimatedCost, actual_cost: input.actualCost
        }).select().single();
        if (error) throw error;
        return data;
    }

    async updateWbsItem(id: string, input: any) {
        const updates: any = { updated_at: new Date().toISOString() };
        const fm: Record<string, string> = {
            parentId: 'parent_id', wbsCode: 'wbs_code', title: 'title',
            description: 'description', level: 'level', sortOrder: 'sort_order',
            status: 'status', assignedTo: 'assigned_to',
            estimatedCost: 'estimated_cost', actualCost: 'actual_cost'
        };
        for (const [k, c] of Object.entries(fm)) { if (input[k] !== undefined) updates[c] = input[k]; }
        const { data, error } = await this.db.from('pm_wbs_items').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    async deleteWbsItem(id: string): Promise<boolean> {
        const { error } = await this.db.from('pm_wbs_items').delete().eq('id', id);
        if (error) throw error;
        return true;
    }

    // Requirements
    async getRequirements(projectId: string) {
        const { data, error } = await this.db.from('pm_requirements')
            .select('*').eq('project_id', projectId).order('requirement_id', { ascending: true });
        if (error) throw error;
        return data;
    }

    async createRequirement(tenantId: string, input: any) {
        const { data, error } = await this.db.from('pm_requirements').insert({
            tenant_id: tenantId, project_id: input.projectId,
            requirement_id: input.requirementId, title: input.title,
            description: input.description, category: input.category,
            priority: input.priority || 'medium', source: input.source,
            wbs_item_id: input.wbsItemId, test_case: input.testCase,
            verification_method: input.verificationMethod,
            status: input.status || 'identified'
        }).select().single();
        if (error) throw error;
        return data;
    }

    async updateRequirement(id: string, input: any) {
        const updates: any = { updated_at: new Date().toISOString() };
        const fm: Record<string, string> = {
            requirementId: 'requirement_id', title: 'title', description: 'description',
            category: 'category', priority: 'priority', source: 'source',
            wbsItemId: 'wbs_item_id', testCase: 'test_case',
            verificationMethod: 'verification_method', status: 'status'
        };
        for (const [k, c] of Object.entries(fm)) { if (input[k] !== undefined) updates[c] = input[k]; }
        const { data, error } = await this.db.from('pm_requirements').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    async deleteRequirement(id: string): Promise<boolean> {
        const { error } = await this.db.from('pm_requirements').delete().eq('id', id);
        if (error) throw error;
        return true;
    }

    // ═══════════════════════════════════════════════════════════
    // ─── SCHEDULE MANAGEMENT ───────────────────────────────────
    // ═══════════════════════════════════════════════════════════

    async getMilestones(projectId: string) {
        const { data, error } = await this.db.from('pm_milestones')
            .select('*').eq('project_id', projectId).order('sort_order', { ascending: true });
        if (error) throw error;
        return data;
    }

    async createMilestone(tenantId: string, input: any) {
        const { data, error } = await this.db.from('pm_milestones').insert({
            tenant_id: tenantId, project_id: input.projectId,
            name: input.name, description: input.description,
            due_date: input.dueDate, completed_date: input.completedDate,
            percent_complete: input.percentComplete || 0,
            is_critical: input.isCritical || false,
            status: input.status || 'pending', sort_order: input.sortOrder || 0
        }).select().single();
        if (error) throw error;
        return data;
    }

    async updateMilestone(id: string, input: any) {
        const updates: any = { updated_at: new Date().toISOString() };
        const fm: Record<string, string> = {
            name: 'name', description: 'description', dueDate: 'due_date',
            completedDate: 'completed_date', percentComplete: 'percent_complete',
            isCritical: 'is_critical', status: 'status', sortOrder: 'sort_order'
        };
        for (const [k, c] of Object.entries(fm)) { if (input[k] !== undefined) updates[c] = input[k]; }
        const { data, error } = await this.db.from('pm_milestones').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    async deleteMilestone(id: string): Promise<boolean> {
        const { error } = await this.db.from('pm_milestones').delete().eq('id', id);
        if (error) throw error;
        return true;
    }

    async getTaskDependencies(projectId: string) {
        const { data, error } = await this.db.from('pm_task_dependencies')
            .select('*').eq('project_id', projectId);
        if (error) throw error;
        return data;
    }

    async createTaskDependency(input: any) {
        const { data, error } = await this.db.from('pm_task_dependencies').insert({
            project_id: input.projectId,
            predecessor_id: input.predecessorId,
            successor_id: input.successorId,
            dependency_type: input.dependencyType || 'FS',
            lag_days: input.lagDays || 0
        }).select().single();
        if (error) throw error;
        return data;
    }

    async deleteTaskDependency(id: string): Promise<boolean> {
        const { error } = await this.db.from('pm_task_dependencies').delete().eq('id', id);
        if (error) throw error;
        return true;
    }

    // ═══════════════════════════════════════════════════════════
    // ─── QUALITY MANAGEMENT ────────────────────────────────────
    // ═══════════════════════════════════════════════════════════

    async getQualityMetrics(projectId: string) {
        const { data, error } = await this.db.from('pm_quality_metrics')
            .select('*').eq('project_id', projectId).order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    }

    async createQualityMetric(tenantId: string, input: any) {
        const { data, error } = await this.db.from('pm_quality_metrics').insert({
            tenant_id: tenantId, project_id: input.projectId,
            metric_name: input.metricName, description: input.description,
            unit: input.unit, target_value: input.targetValue,
            actual_value: input.actualValue, tolerance_lower: input.toleranceLower,
            tolerance_upper: input.toleranceUpper, measurement_method: input.measurementMethod,
            frequency: input.frequency, status: input.status || 'on_track'
        }).select().single();
        if (error) throw error;
        return data;
    }

    async updateQualityMetric(id: string, input: any) {
        const updates: any = { updated_at: new Date().toISOString() };
        const fm: Record<string, string> = {
            metricName: 'metric_name', description: 'description', unit: 'unit',
            targetValue: 'target_value', actualValue: 'actual_value',
            toleranceLower: 'tolerance_lower', toleranceUpper: 'tolerance_upper',
            measurementMethod: 'measurement_method', frequency: 'frequency', status: 'status'
        };
        for (const [k, c] of Object.entries(fm)) { if (input[k] !== undefined) updates[c] = input[k]; }
        const { data, error } = await this.db.from('pm_quality_metrics').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    async deleteQualityMetric(id: string): Promise<boolean> {
        const { error } = await this.db.from('pm_quality_metrics').delete().eq('id', id);
        if (error) throw error;
        return true;
    }

    async getQualityChecklists(projectId: string) {
        const { data, error } = await this.db.from('pm_quality_checklists')
            .select('*').eq('project_id', projectId).order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    }

    async createQualityChecklist(tenantId: string, input: any) {
        const { data, error } = await this.db.from('pm_quality_checklists').insert({
            tenant_id: tenantId, project_id: input.projectId,
            checklist_name: input.checklistName, description: input.description,
            deliverable: input.deliverable, items: input.items || [],
            inspector: input.inspector, inspection_date: input.inspectionDate,
            status: input.status || 'pending'
        }).select().single();
        if (error) throw error;
        return data;
    }

    async updateQualityChecklist(id: string, input: any) {
        const updates: any = { updated_at: new Date().toISOString() };
        const fm: Record<string, string> = {
            checklistName: 'checklist_name', description: 'description',
            deliverable: 'deliverable', items: 'items', inspector: 'inspector',
            inspectionDate: 'inspection_date', status: 'status'
        };
        for (const [k, c] of Object.entries(fm)) { if (input[k] !== undefined) updates[c] = input[k]; }
        const { data, error } = await this.db.from('pm_quality_checklists').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    async deleteQualityChecklist(id: string): Promise<boolean> {
        const { error } = await this.db.from('pm_quality_checklists').delete().eq('id', id);
        if (error) throw error;
        return true;
    }

    async getQualityInspections(projectId: string) {
        const { data, error } = await this.db.from('pm_quality_inspections')
            .select('*').eq('project_id', projectId).order('inspection_date', { ascending: false });
        if (error) throw error;
        return data;
    }

    async createQualityInspection(tenantId: string, input: any) {
        const { data, error } = await this.db.from('pm_quality_inspections').insert({
            tenant_id: tenantId, project_id: input.projectId,
            inspection_type: input.inspectionType, deliverable: input.deliverable,
            inspector: input.inspector, inspection_date: input.inspectionDate,
            findings: input.findings, corrective_actions: input.correctiveActions,
            result: input.result || 'pending', follow_up_date: input.followUpDate
        }).select().single();
        if (error) throw error;
        return data;
    }

    async updateQualityInspection(id: string, input: any) {
        const updates: any = { updated_at: new Date().toISOString() };
        const fm: Record<string, string> = {
            inspectionType: 'inspection_type', deliverable: 'deliverable',
            inspector: 'inspector', inspectionDate: 'inspection_date',
            findings: 'findings', correctiveActions: 'corrective_actions',
            result: 'result', followUpDate: 'follow_up_date'
        };
        for (const [k, c] of Object.entries(fm)) { if (input[k] !== undefined) updates[c] = input[k]; }
        const { data, error } = await this.db.from('pm_quality_inspections').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    async deleteQualityInspection(id: string): Promise<boolean> {
        const { error } = await this.db.from('pm_quality_inspections').delete().eq('id', id);
        if (error) throw error;
        return true;
    }

    // ═══════════════════════════════════════════════════════════
    // ─── RESOURCE MANAGEMENT ───────────────────────────────────
    // ═══════════════════════════════════════════════════════════

    async getResourcePlans(projectId: string) {
        const { data, error } = await this.db.from('pm_resource_plans')
            .select('*').eq('project_id', projectId).order('resource_name', { ascending: true });
        if (error) throw error;
        return data;
    }

    async createResourcePlan(tenantId: string, input: any) {
        const { data, error } = await this.db.from('pm_resource_plans').insert({
            tenant_id: tenantId, project_id: input.projectId,
            resource_name: input.resourceName, role: input.role,
            resource_type: input.resourceType || 'human',
            allocation_percent: input.allocationPercent || 100,
            hourly_rate: input.hourlyRate, start_date: input.startDate,
            end_date: input.endDate, availability_hours: input.availabilityHours,
            planned_hours: input.plannedHours, actual_hours: input.actualHours,
            skills: input.skills, notes: input.notes,
            status: input.status || 'planned'
        }).select().single();
        if (error) throw error;
        return data;
    }

    async updateResourcePlan(id: string, input: any) {
        const updates: any = { updated_at: new Date().toISOString() };
        const fm: Record<string, string> = {
            resourceName: 'resource_name', role: 'role', resourceType: 'resource_type',
            allocationPercent: 'allocation_percent', hourlyRate: 'hourly_rate',
            startDate: 'start_date', endDate: 'end_date',
            availabilityHours: 'availability_hours', plannedHours: 'planned_hours',
            actualHours: 'actual_hours', skills: 'skills', notes: 'notes', status: 'status'
        };
        for (const [k, c] of Object.entries(fm)) { if (input[k] !== undefined) updates[c] = input[k]; }
        const { data, error } = await this.db.from('pm_resource_plans').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    async deleteResourcePlan(id: string): Promise<boolean> {
        const { error } = await this.db.from('pm_resource_plans').delete().eq('id', id);
        if (error) throw error;
        return true;
    }

    async getRaciMatrix(projectId: string) {
        const { data, error } = await this.db.from('pm_raci_matrix')
            .select('*').eq('project_id', projectId).order('deliverable', { ascending: true });
        if (error) throw error;
        return data;
    }

    async createRaciEntry(tenantId: string, input: any) {
        const { data, error } = await this.db.from('pm_raci_matrix').insert({
            tenant_id: tenantId, project_id: input.projectId,
            deliverable: input.deliverable, person_name: input.personName,
            role_type: input.roleType, notes: input.notes
        }).select().single();
        if (error) throw error;
        return data;
    }

    async updateRaciEntry(id: string, input: any) {
        const updates: any = { updated_at: new Date().toISOString() };
        const fm: Record<string, string> = {
            deliverable: 'deliverable', personName: 'person_name',
            roleType: 'role_type', notes: 'notes'
        };
        for (const [k, c] of Object.entries(fm)) { if (input[k] !== undefined) updates[c] = input[k]; }
        const { data, error } = await this.db.from('pm_raci_matrix').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    async deleteRaciEntry(id: string): Promise<boolean> {
        const { error } = await this.db.from('pm_raci_matrix').delete().eq('id', id);
        if (error) throw error;
        return true;
    }

    // ═══════════════════════════════════════════════════════════
    // ─── COMMUNICATIONS MANAGEMENT ─────────────────────────────
    // ═══════════════════════════════════════════════════════════

    async getCommPlans(projectId: string) {
        const { data, error } = await this.db.from('pm_comm_plans')
            .select('*').eq('project_id', projectId).order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    }

    async createCommPlan(tenantId: string, input: any) {
        const { data, error } = await this.db.from('pm_comm_plans').insert({
            tenant_id: tenantId, project_id: input.projectId,
            communication_item: input.communicationItem, target_audience: input.targetAudience,
            frequency: input.frequency, method: input.method,
            responsible_person: input.responsiblePerson, key_message: input.keyMessage,
            notes: input.notes, status: input.status || 'active'
        }).select().single();
        if (error) throw error;
        return data;
    }

    async updateCommPlan(id: string, input: any) {
        const updates: any = { updated_at: new Date().toISOString() };
        const fm: Record<string, string> = {
            communicationItem: 'communication_item', targetAudience: 'target_audience',
            frequency: 'frequency', method: 'method',
            responsiblePerson: 'responsible_person', keyMessage: 'key_message',
            notes: 'notes', status: 'status'
        };
        for (const [k, c] of Object.entries(fm)) { if (input[k] !== undefined) updates[c] = input[k]; }
        const { data, error } = await this.db.from('pm_comm_plans').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    async deleteCommPlan(id: string): Promise<boolean> {
        const { error } = await this.db.from('pm_comm_plans').delete().eq('id', id);
        if (error) throw error;
        return true;
    }

    async getStatusReports(projectId: string) {
        const { data, error } = await this.db.from('pm_status_reports')
            .select('*').eq('project_id', projectId).order('report_date', { ascending: false });
        if (error) throw error;
        return data;
    }

    async createStatusReport(tenantId: string, input: any) {
        const { data, error } = await this.db.from('pm_status_reports').insert({
            tenant_id: tenantId, project_id: input.projectId,
            report_date: input.reportDate, report_period: input.reportPeriod,
            overall_health: input.overallHealth || 'green',
            schedule_health: input.scheduleHealth || 'green',
            cost_health: input.costHealth || 'green',
            scope_health: input.scopeHealth || 'green',
            accomplishments: input.accomplishments, planned_activities: input.plannedActivities,
            issues_and_risks: input.issuesAndRisks, decisions_needed: input.decisionsNeeded,
            key_metrics: input.keyMetrics, prepared_by: input.preparedBy
        }).select().single();
        if (error) throw error;
        return data;
    }

    async updateStatusReport(id: string, input: any) {
        const updates: any = { updated_at: new Date().toISOString() };
        const fm: Record<string, string> = {
            reportDate: 'report_date', reportPeriod: 'report_period',
            overallHealth: 'overall_health', scheduleHealth: 'schedule_health',
            costHealth: 'cost_health', scopeHealth: 'scope_health',
            accomplishments: 'accomplishments', plannedActivities: 'planned_activities',
            issuesAndRisks: 'issues_and_risks', decisionsNeeded: 'decisions_needed',
            keyMetrics: 'key_metrics', preparedBy: 'prepared_by'
        };
        for (const [k, c] of Object.entries(fm)) { if (input[k] !== undefined) updates[c] = input[k]; }
        const { data, error } = await this.db.from('pm_status_reports').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    async deleteStatusReport(id: string): Promise<boolean> {
        const { error } = await this.db.from('pm_status_reports').delete().eq('id', id);
        if (error) throw error;
        return true;
    }

    async getMeetingMinutes(projectId: string) {
        const { data, error } = await this.db.from('pm_meeting_minutes')
            .select('*').eq('project_id', projectId).order('meeting_date', { ascending: false });
        if (error) throw error;
        return data;
    }

    async createMeetingMinutes(tenantId: string, input: any) {
        const { data, error } = await this.db.from('pm_meeting_minutes').insert({
            tenant_id: tenantId, project_id: input.projectId,
            meeting_type: input.meetingType, meeting_date: input.meetingDate,
            title: input.title, attendees: input.attendees,
            agenda: input.agenda, discussion: input.discussion,
            decisions: input.decisions, action_items: input.actionItems || [],
            next_meeting_date: input.nextMeetingDate
        }).select().single();
        if (error) throw error;
        return data;
    }

    async updateMeetingMinutes(id: string, input: any) {
        const updates: any = { updated_at: new Date().toISOString() };
        const fm: Record<string, string> = {
            meetingType: 'meeting_type', meetingDate: 'meeting_date', title: 'title',
            attendees: 'attendees', agenda: 'agenda', discussion: 'discussion',
            decisions: 'decisions', actionItems: 'action_items',
            nextMeetingDate: 'next_meeting_date'
        };
        for (const [k, c] of Object.entries(fm)) { if (input[k] !== undefined) updates[c] = input[k]; }
        const { data, error } = await this.db.from('pm_meeting_minutes').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    async deleteMeetingMinutes(id: string): Promise<boolean> {
        const { error } = await this.db.from('pm_meeting_minutes').delete().eq('id', id);
        if (error) throw error;
        return true;
    }

    // ═══════════════════════════════════════════════════════════
    // ─── PROCUREMENT MANAGEMENT ────────────────────────────────
    // ═══════════════════════════════════════════════════════════

    async getProcurementLinks(projectId: string) {
        const { data, error } = await this.db.from('pm_procurement_links')
            .select('*').eq('project_id', projectId).order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    }

    async createProcurementLink(tenantId: string, input: any) {
        const { data, error } = await this.db.from('pm_procurement_links').insert({
            tenant_id: tenantId, project_id: input.projectId,
            entity_type: input.entityType, entity_id: input.entityId,
            contract_type: input.contractType, budget_allocated: input.budgetAllocated,
            description: input.description, notes: input.notes,
            status: input.status || 'active'
        }).select().single();
        if (error) throw error;
        return data;
    }

    async updateProcurementLink(id: string, input: any) {
        const updates: any = { updated_at: new Date().toISOString() };
        const fm: Record<string, string> = {
            entityType: 'entity_type', entityId: 'entity_id',
            contractType: 'contract_type', budgetAllocated: 'budget_allocated',
            description: 'description', notes: 'notes', status: 'status'
        };
        for (const [k, c] of Object.entries(fm)) { if (input[k] !== undefined) updates[c] = input[k]; }
        const { data, error } = await this.db.from('pm_procurement_links').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    async deleteProcurementLink(id: string): Promise<boolean> {
        const { error } = await this.db.from('pm_procurement_links').delete().eq('id', id);
        if (error) throw error;
        return true;
    }

    // ═══════════════════════════════════════════════════════════
    // ─── STAKEHOLDER MANAGEMENT ────────────────────────────────
    // ═══════════════════════════════════════════════════════════

    async getStakeholders(projectId: string) {
        const { data, error } = await this.db.from('pm_stakeholders')
            .select('*').eq('project_id', projectId).order('power_level', { ascending: false });
        if (error) throw error;
        return data;
    }

    async createStakeholder(tenantId: string, input: any) {
        const { data, error } = await this.db.from('pm_stakeholders').insert({
            tenant_id: tenantId, project_id: input.projectId,
            name: input.name, title: input.title, role: input.role, organization: input.organization,
            email: input.email, phone: input.phone, contact_info: input.contactInfo,
            interest_level: input.interestLevel || 3, power_level: input.powerLevel || input.influenceLevel || 3,
            influence_level: input.influenceLevel || input.powerLevel || 3,
            support_level: input.supportLevel || 'neutral',
            current_engagement: input.currentEngagement || 'neutral',
            desired_engagement: input.desiredEngagement || 'supportive',
            communication_needs: input.communicationNeeds,
            influence_strategy: input.influenceStrategy || input.engagementStrategy,
            notes: input.notes, status: input.status || 'active'
        }).select().single();
        if (error) throw error;
        return data;
    }

    async updateStakeholder(id: string, input: any) {
        const updates: any = { updated_at: new Date().toISOString() };
        const fm: Record<string, string> = {
            name: 'name', title: 'title', role: 'role', organization: 'organization', email: 'email',
            phone: 'phone', contactInfo: 'contact_info',
            interestLevel: 'interest_level', powerLevel: 'power_level',
            influenceLevel: 'influence_level', supportLevel: 'support_level',
            currentEngagement: 'current_engagement', desiredEngagement: 'desired_engagement',
            communicationNeeds: 'communication_needs', influenceStrategy: 'influence_strategy',
            engagementStrategy: 'influence_strategy',
            notes: 'notes', status: 'status'
        };
        for (const [k, c] of Object.entries(fm)) { if (input[k] !== undefined) updates[c] = input[k]; }
        const { data, error } = await this.db.from('pm_stakeholders').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    async deleteStakeholder(id: string): Promise<boolean> {
        const { error } = await this.db.from('pm_stakeholders').delete().eq('id', id);
        if (error) throw error;
        return true;
    }

    // ═══════════════════════════════════════════════════════════
    // ─── INTEGRATION MANAGEMENT (Change Requests & Lessons) ────
    // ═══════════════════════════════════════════════════════════

    async getChangeRequests(projectId: string) {
        const { data, error } = await this.db.from('pm_change_requests')
            .select('*').eq('project_id', projectId).order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    }

    async createChangeRequest(tenantId: string, input: any) {
        const { data, error } = await this.db.from('pm_change_requests').insert({
            tenant_id: tenantId, project_id: input.projectId,
            change_number: input.changeNumber, title: input.title,
            description: input.description, reason: input.reason,
            impact_scope: input.impactScope, impact_schedule: input.impactSchedule,
            impact_cost: input.impactCost, impact_quality: input.impactQuality,
            requested_by: input.requestedBy, requested_date: input.requestedDate,
            priority: input.priority || 'medium', status: input.status || 'submitted'
        }).select().single();
        if (error) throw error;
        return data;
    }

    async updateChangeRequest(id: string, input: any) {
        const updates: any = { updated_at: new Date().toISOString() };
        const fm: Record<string, string> = {
            changeNumber: 'change_number', title: 'title', description: 'description',
            reason: 'reason', impactScope: 'impact_scope', impactSchedule: 'impact_schedule',
            impactCost: 'impact_cost', impactQuality: 'impact_quality',
            requestedBy: 'requested_by', requestedDate: 'requested_date',
            reviewedBy: 'reviewed_by', decision: 'decision', decisionDate: 'decision_date',
            decisionNotes: 'decision_notes', implementationNotes: 'implementation_notes',
            priority: 'priority', status: 'status'
        };
        for (const [k, c] of Object.entries(fm)) { if (input[k] !== undefined) updates[c] = input[k]; }
        const { data, error } = await this.db.from('pm_change_requests').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    async deleteChangeRequest(id: string): Promise<boolean> {
        const { error } = await this.db.from('pm_change_requests').delete().eq('id', id);
        if (error) throw error;
        return true;
    }

    async getLessonsLearned(projectId: string) {
        const { data, error } = await this.db.from('pm_lessons_learned')
            .select('*').eq('project_id', projectId).order('submitted_date', { ascending: false });
        if (error) throw error;
        return data;
    }

    async createLessonLearned(tenantId: string, input: any) {
        const { data, error } = await this.db.from('pm_lessons_learned').insert({
            tenant_id: tenantId, project_id: input.projectId,
            category: input.category, title: input.title,
            situation: input.situation, impact: input.impact,
            lesson: input.lesson, recommendation: input.recommendation,
            submitted_by: input.submittedBy,
            submitted_date: input.submittedDate || new Date().toISOString().split('T')[0],
            phase: input.phase, tags: input.tags || []
        }).select().single();
        if (error) throw error;
        return data;
    }

    async updateLessonLearned(id: string, input: any) {
        const updates: any = { updated_at: new Date().toISOString() };
        const fm: Record<string, string> = {
            category: 'category', title: 'title', situation: 'situation',
            impact: 'impact', lesson: 'lesson', recommendation: 'recommendation',
            submittedBy: 'submitted_by', submittedDate: 'submitted_date',
            phase: 'phase', tags: 'tags'
        };
        for (const [k, c] of Object.entries(fm)) { if (input[k] !== undefined) updates[c] = input[k]; }
        const { data, error } = await this.db.from('pm_lessons_learned').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    async deleteLessonLearned(id: string): Promise<boolean> {
        const { error } = await this.db.from('pm_lessons_learned').delete().eq('id', id);
        if (error) throw error;
        return true;
    }

    // ═══════════════════════════════════════════════════════════
    // ─── ACTIVITIES (Schedule Management) ─────────────────────
    // ═══════════════════════════════════════════════════════════

    async getActivities(projectId: string) {
        const { data, error } = await this.db.from('pm_activities')
            .select('*').eq('project_id', projectId).order('start_date', { ascending: true });
        if (error) throw error;
        return data;
    }

    async createActivity(tenantId: string, input: any) {
        const payload = {
            tenant_id: tenantId,
            project_id: input.projectId,
            name: input.name,
            description: input.description,
            predecessor_id: input.predecessorId || null,
            duration_days: input.durationDays || 1,
            start_date: input.startDate,
            end_date: input.endDate,
            status: input.status || 'not_started',
            wbs_item_id: input.wbsItemId || null,
            milestone_id: input.milestoneId || null,
            assigned_to: input.assignedTo,
        };
        const { data, error } = await this.db.from('pm_activities').insert(payload).select().single();
        if (error) throw error;
        return data;
    }

    async updateActivity(id: string, input: any) {
        const fields: any = { updated_at: new Date().toISOString() };
        if (input.name !== undefined) fields.name = input.name;
        if (input.description !== undefined) fields.description = input.description;
        if (input.predecessorId !== undefined) fields.predecessor_id = input.predecessorId;
        if (input.durationDays !== undefined) fields.duration_days = input.durationDays;
        if (input.startDate !== undefined) fields.start_date = input.startDate;
        if (input.endDate !== undefined) fields.end_date = input.endDate;
        if (input.status !== undefined) fields.status = input.status;
        if (input.wbsItemId !== undefined) fields.wbs_item_id = input.wbsItemId;
        if (input.milestoneId !== undefined) fields.milestone_id = input.milestoneId;
        if (input.assignedTo !== undefined) fields.assigned_to = input.assignedTo;
        const { data, error } = await this.db.from('pm_activities').update(fields).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    async deleteActivity(id: string): Promise<boolean> {
        const { error } = await this.db.from('pm_activities').delete().eq('id', id);
        if (error) throw error;
        return true;
    }

    // ═══════════════════════════════════════════════════════════
    // ─── AI: Generate Schedule from WBS ──────────────────────
    // ═══════════════════════════════════════════════════════════

    async generateScheduleFromWbs(projectId: string): Promise<any> {
        const { data: project } = await this.db.from('pm_projects').select('*').eq('id', projectId).single();
        if (!project) throw new Error('Project not found');

        const { data: wbsItems } = await this.db.from('pm_wbs_items').select('*').eq('project_id', projectId);
        const wbsList = (wbsItems || []).map(w => `${w.wbs_code}: ${w.title}`).join(', ');

        const prompt = `
            You are an expert Project Schedule Manager (PMBOK 6).
            Generate milestones and activities for this project based on its WBS:
            Project: ${project.name}
            Description: ${project.description || 'N/A'}
            WBS Items: ${wbsList || 'No WBS items yet'}

            Return ONLY a valid JSON object:
            {
                "milestones": [
                    { "name": "Milestone name", "plannedDate": "YYYY-MM-DD", "status": "pending", "wbsCode": "1" }
                ],
                "activities": [
                    { "name": "Activity name", "durationDays": 5, "wbsCode": "1.1", "description": "Brief description" }
                ]
            }
            Generate 5-8 milestones and 8-12 activities.
        `;

        try {
            return await this.aiRouter.generateStructuredJSON(prompt);
        } catch (error) {
            this.logger.error("Failed to generate schedule via AI", error);
            throw new Error("AI Schedule generation failed.");
        }
    }

    // ═══════════════════════════════════════════════════════════
    // ─── AI: Generate Tasks from WBS ─────────────────────────
    // ═══════════════════════════════════════════════════════════

    async generateTasksFromWbs(projectId: string): Promise<any> {
        const { data: project } = await this.db.from('pm_projects').select('*').eq('id', projectId).single();
        if (!project) throw new Error('Project not found');

        const { data: wbsItems } = await this.db.from('pm_wbs_items').select('*').eq('project_id', projectId);
        const wbsList = (wbsItems || []).map(w => `${w.wbs_code}: ${w.title} (${w.description || 'N/A'})`).join('\n');

        const prompt = `
            You are an expert Project Task Manager.
            Generate actionable tasks for the project backlog based on the WBS below.
            Each task should map to a specific WBS work package.
            Project: ${project.name}
            Description: ${project.description || 'N/A'}

            WBS Items:
            ${wbsList || 'No WBS items yet - generate generic project tasks'}

            Return ONLY a valid JSON object:
            {
                "tasks": [
                    {
                        "title": "Task title",
                        "description": "Detailed task description",
                        "priority": "high|medium|low",
                        "type": "task|story|bug",
                        "estimatedHours": number,
                        "wbsCode": "1.1"
                    }
                ]
            }
            Generate 5-10 actionable tasks.
        `;

        try {
            return await this.aiRouter.generateStructuredJSON(prompt);
        } catch (error) {
            this.logger.error("Failed to generate tasks from WBS via AI", error);
            throw new Error("AI Task generation failed.");
        }
    }

    // ═══════════════════════════════════════════════════════════
    // ─── AI GENERATORS (New Knowledge Areas) ───────────────────
    // ═══════════════════════════════════════════════════════════


    async generateWbs(projectId: string): Promise<any> {
        const { data: project } = await this.db.from('pm_projects').select('*').eq('id', projectId).single();
        if (!project) throw new Error('Project not found');

        const prompt = `
            You are an expert WBS (Work Breakdown Structure) specialist following PMBOK 6/7 standards.
            Create a very detailed and comprehensive WBS for the following project, with deep decomposition up to 8 levels:
            Name: ${project.name}
            Description: ${project.description || 'N/A'}
            Budget: $${project.budget || 'N/A'}

            Return ONLY a valid JSON object matching this schema:
            {
                "items": [
                    { "wbsCode": "1", "title": "...", "level": 0, "description": "...", "children": [
                        { "wbsCode": "1.1", "title": "...", "level": 1, "description": "...", "children": [
                            { "wbsCode": "1.1.1", "title": "...", "level": 2, "description": "...", "children": [
                                { "wbsCode": "1.1.1.1", "title": "...", "level": 3, "description": "...", "children": [...] }
                            ]}
                        ]}
                    ]}
                ]
            }

            Rules:
            - Generate 4-6 top-level work packages (level 0)
            - Each top-level item should have 3-5 children (level 1)
            - Continue nesting children as deep as possible, up to 8 levels (level 0 through level 7)
            - At minimum, aim for 5+ levels of depth on the most complex branches
            - Use progressive decomposition: Phase → Deliverable → Work Package → Activity → Sub-activity → Task → Sub-task → Work Unit
            - Each item MUST have wbsCode, title, level, description, and children (empty array [] for leaf nodes)
            - wbsCode follows dot notation: "1", "1.1", "1.1.1", "1.1.1.1", etc.
            - Generate a minimum of 60 total WBS items across all levels
        `;

        try {
            return await this.aiRouter.generateStructuredJSON(prompt);
        } catch (error) {
            this.logger.error("Failed to generate WBS via AI", error);
            throw new Error("AI WBS generation failed.");
        }
    }

    async generateStakeholderAnalysis(projectId: string): Promise<any> {
        const { data: project } = await this.db.from('pm_projects').select('*').eq('id', projectId).single();
        if (!project) throw new Error('Project not found');

        const prompt = `
            You are an expert in Stakeholder Management (PMBOK 6/7).
            Identify 5-8 typical stakeholders for the following project:
            Name: ${project.name}
            Description: ${project.description || 'N/A'}

            Return ONLY a valid JSON object:
            {
                "stakeholders": [
                    {
                        "name": "Role-based name (e.g. Project Sponsor)",
                        "role": "Their role in the project",
                        "organization": "Their department or org",
                        "interestLevel": number (1-5),
                        "powerLevel": number (1-5),
                        "currentEngagement": "unaware|resistant|neutral|supportive|leading",
                        "desiredEngagement": "supportive|leading",
                        "communicationNeeds": "What they need to know and how often",
                        "influenceStrategy": "How to engage them"
                    }
                ]
            }
        `;

        try {
            return await this.aiRouter.generateStructuredJSON(prompt);
        } catch (error) {
            this.logger.error("Failed to generate stakeholder analysis via AI", error);
            throw new Error("AI Stakeholder analysis failed.");
        }
    }

    async generateQualityChecklist(projectId: string, deliverable: string): Promise<any> {
        const { data: project } = await this.db.from('pm_projects').select('*').eq('id', projectId).single();
        if (!project) throw new Error('Project not found');

        const prompt = `
            You are an expert Quality Assurance Manager.
            Create a quality checklist for the deliverable: "${deliverable}"
            in the context of project: "${project.name}" (${project.description || 'N/A'})

            Return ONLY a valid JSON object:
            {
                "checklistName": "Quality Checklist for ${deliverable}",
                "items": [
                    { "item": "Checklist item description", "passed": false, "notes": "" }
                ]
            }
            Generate 8-12 relevant quality check items.
        `;

        try {
            return await this.aiRouter.generateStructuredJSON(prompt);
        } catch (error) {
            this.logger.error("Failed to generate quality checklist via AI", error);
            throw new Error("AI Quality Checklist generation failed.");
        }
    }

    async generateCommPlan(projectId: string): Promise<any> {
        const { data: project } = await this.db.from('pm_projects').select('*').eq('id', projectId).single();
        if (!project) throw new Error('Project not found');

        const prompt = `
            You are an expert Communication Management Planner (PMBOK 6).
            Create a communication plan for the following project:
            Name: ${project.name}
            Description: ${project.description || 'N/A'}

            Return ONLY a valid JSON object:
            {
                "communications": [
                    {
                        "communicationItem": "Name of the communication",
                        "targetAudience": "Who receives it",
                        "frequency": "daily|weekly|biweekly|monthly|as_needed",
                        "method": "email|meeting|report|dashboard|presentation",
                        "responsiblePerson": "Role responsible",
                        "keyMessage": "What information is conveyed"
                    }
                ]
            }
            Generate 5-8 standard project communications.
        `;

        try {
            return await this.aiRouter.generateStructuredJSON(prompt);
        } catch (error) {
            this.logger.error("Failed to generate comm plan via AI", error);
            throw new Error("AI Communication Plan generation failed.");
        }
    }

    // ═══════════════════════════════════════════════════════════
    // ─── PMBOK 7: PRINCIPLE ASSESSMENTS ─────────────────────────
    // ═══════════════════════════════════════════════════════════

    async getPrincipleAssessments(projectId: string) {
        const { data, error } = await this.db.from('pm_principle_assessments')
            .select('*').eq('project_id', projectId).order('principle_key', { ascending: true });
        if (error) throw error;
        return data;
    }

    async upsertPrincipleAssessment(tenantId: string, input: any) {
        const payload = {
            tenant_id: tenantId,
            project_id: input.projectId,
            principle_key: input.principleKey,
            principle_name: input.principleName,
            score: input.score || 3,
            notes: input.notes,
            evidence: input.evidence,
            assessed_by: input.assessedBy,
            assessed_date: input.assessedDate || new Date().toISOString().split('T')[0],
            updated_at: new Date().toISOString()
        };
        const { data, error } = await this.db.from('pm_principle_assessments')
            .upsert(payload, { onConflict: 'project_id,principle_key' }).select().single();
        if (error) throw error;
        return data;
    }

    async deletePrincipleAssessment(id: string): Promise<boolean> {
        const { error } = await this.db.from('pm_principle_assessments').delete().eq('id', id);
        if (error) throw error;
        return true;
    }

    // ═══════════════════════════════════════════════════════════
    // ─── PMBOK 7: PERFORMANCE DOMAIN HEALTH ─────────────────────
    // ═══════════════════════════════════════════════════════════

    async getDomainHealth(projectId: string) {
        const { data, error } = await this.db.from('pm_domain_health')
            .select('*').eq('project_id', projectId).order('domain_key', { ascending: true });
        if (error) throw error;
        return data;
    }

    async upsertDomainHealth(tenantId: string, input: any) {
        const payload = {
            tenant_id: tenantId,
            project_id: input.projectId,
            domain_key: input.domainKey,
            domain_name: input.domainName,
            health_status: input.healthStatus || 'green',
            score: input.score || 3,
            description: input.description,
            outcomes_achieved: input.outcomesAchieved,
            challenges: input.challenges,
            improvement_actions: input.improvementActions,
            snapshot_date: input.snapshotDate || new Date().toISOString().split('T')[0],
            updated_at: new Date().toISOString()
        };
        const { data, error } = await this.db.from('pm_domain_health')
            .upsert(payload, { onConflict: 'project_id,domain_key,snapshot_date' }).select().single();
        if (error) throw error;
        return data;
    }

    async deleteDomainHealth(id: string): Promise<boolean> {
        const { error } = await this.db.from('pm_domain_health').delete().eq('id', id);
        if (error) throw error;
        return true;
    }

    // ═══════════════════════════════════════════════════════════
    // ─── PMBOK 7: BENEFITS REALIZATION ──────────────────────────
    // ═══════════════════════════════════════════════════════════

    async getBenefits(projectId: string) {
        const { data, error } = await this.db.from('pm_benefits')
            .select('*').eq('project_id', projectId).order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    }

    async createBenefit(tenantId: string, input: any) {
        const { data, error } = await this.db.from('pm_benefits').insert({
            tenant_id: tenantId,
            project_id: input.projectId,
            benefit_name: input.benefitName,
            description: input.description,
            category: input.category || 'tangible',
            target_value: input.targetValue,
            actual_value: input.actualValue,
            measurement_method: input.measurementMethod,
            baseline: input.baseline,
            target_date: input.targetDate,
            realization_date: input.realizationDate,
            owner: input.owner,
            status: input.status || 'planned',
            notes: input.notes
        }).select().single();
        if (error) throw error;
        return data;
    }

    async updateBenefit(id: string, input: any) {
        const updates: any = { updated_at: new Date().toISOString() };
        const fm: Record<string, string> = {
            benefitName: 'benefit_name', description: 'description', category: 'category',
            targetValue: 'target_value', actualValue: 'actual_value',
            measurementMethod: 'measurement_method', baseline: 'baseline',
            targetDate: 'target_date', realizationDate: 'realization_date',
            owner: 'owner', status: 'status', notes: 'notes'
        };
        for (const [k, c] of Object.entries(fm)) { if (input[k] !== undefined) updates[c] = input[k]; }
        const { data, error } = await this.db.from('pm_benefits').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    async deleteBenefit(id: string): Promise<boolean> {
        const { error } = await this.db.from('pm_benefits').delete().eq('id', id);
        if (error) throw error;
        return true;
    }

    // ═══════════════════════════════════════════════════════════
    // ─── PMBOK 7: TAILORING LOG ─────────────────────────────────
    // ═══════════════════════════════════════════════════════════

    async getTailoringLog(projectId: string) {
        const { data, error } = await this.db.from('pm_tailoring_log')
            .select('*').eq('project_id', projectId).order('decision_date', { ascending: false });
        if (error) throw error;
        return data;
    }

    async createTailoringEntry(tenantId: string, input: any) {
        const { data, error } = await this.db.from('pm_tailoring_log').insert({
            tenant_id: tenantId,
            project_id: input.projectId,
            area: input.area,
            original_approach: input.originalApproach,
            tailored_approach: input.tailoredApproach,
            rationale: input.rationale,
            impact: input.impact,
            decided_by: input.decidedBy,
            decision_date: input.decisionDate || new Date().toISOString().split('T')[0],
            status: input.status || 'approved'
        }).select().single();
        if (error) throw error;
        return data;
    }

    async updateTailoringEntry(id: string, input: any) {
        const updates: any = { updated_at: new Date().toISOString() };
        const fm: Record<string, string> = {
            area: 'area', originalApproach: 'original_approach',
            tailoredApproach: 'tailored_approach', rationale: 'rationale',
            impact: 'impact', decidedBy: 'decided_by',
            decisionDate: 'decision_date', status: 'status'
        };
        for (const [k, c] of Object.entries(fm)) { if (input[k] !== undefined) updates[c] = input[k]; }
        const { data, error } = await this.db.from('pm_tailoring_log').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    async deleteTailoringEntry(id: string): Promise<boolean> {
        const { error } = await this.db.from('pm_tailoring_log').delete().eq('id', id);
        if (error) throw error;
        return true;
    }

    async generateTailoringRecommendations(projectId: string): Promise<any> {
        const { data: project } = await this.db.from('pm_projects').select('*').eq('id', projectId).single();
        if (!project) throw new Error('Project not found');

        const prompt = `
            You are an expert PMBOK 7 Tailoring Consultant.
            Provide tailoring recommendations for:
            Project: ${project.name}
            Description: ${project.description || 'N/A'}
            Methodology: ${project.methodology || 'Hybrid'}
            Budget: $${project.budget || 'N/A'}

            Return ONLY a valid JSON object:
            {
                "recommendations": [
                    {
                        "area": "life_cycle | process | engagement | tools",
                        "originalApproach": "Standard PMBOK approach",
                        "tailoredApproach": "Recommended tailored approach",
                        "rationale": "Why this tailoring",
                        "impact": "Expected impact"
                    }
                ]
            }
            Generate 4-6 tailoring recommendations.
        `;

        try {
            return await this.aiRouter.generateStructuredJSON(prompt);
        } catch (error) {
            this.logger.error("Failed to generate tailoring recommendations via AI", error);
            throw new Error("AI Tailoring Recommendations failed.");
        }
    }

    // ═══════════════════════════════════════════════════════════
    // ─── PMBOK 8: FOCUS AREAS ───────────────────────────────────
    // ═══════════════════════════════════════════════════════════

    async getFocusAreas(projectId: string) {
        const { data, error } = await this.db.from('pm_focus_areas')
            .select('*').eq('project_id', projectId).order('focus_area_key', { ascending: true });
        if (error) throw error;
        return data;
    }

    async upsertFocusArea(tenantId: string, input: any) {
        const payload = {
            tenant_id: tenantId,
            project_id: input.projectId,
            focus_area_key: input.focusAreaKey,
            focus_area_name: input.focusAreaName,
            progress_percent: input.progressPercent || 0,
            status: input.status || 'not_started',
            notes: input.notes,
            key_deliverables: input.keyDeliverables,
            completed_items: input.completedItems || [],
            total_items: input.totalItems || 0,
            snapshot_date: input.snapshotDate || new Date().toISOString().split('T')[0],
            updated_at: new Date().toISOString()
        };
        const { data, error } = await this.db.from('pm_focus_areas')
            .upsert(payload, { onConflict: 'project_id,focus_area_key' }).select().single();
        if (error) throw error;
        return data;
    }

    async deleteFocusArea(id: string): Promise<boolean> {
        const { error } = await this.db.from('pm_focus_areas').delete().eq('id', id);
        if (error) throw error;
        return true;
    }

    // ═══════════════════════════════════════════════════════════
    // ─── PMBOK 8: GOVERNANCE ────────────────────────────────────
    // ═══════════════════════════════════════════════════════════

    async getGovernanceDecisions(projectId: string) {
        const { data, error } = await this.db.from('pm_governance')
            .select('*').eq('project_id', projectId).order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    }

    async createGovernanceDecision(tenantId: string, input: any) {
        const { data, error } = await this.db.from('pm_governance').insert({
            tenant_id: tenantId,
            project_id: input.projectId,
            decision_number: input.decisionNumber,
            title: input.title,
            description: input.description,
            category: input.category || 'strategic',
            decision: input.decision,
            decided_by: input.decidedBy,
            decision_date: input.decisionDate,
            escalation_level: input.escalationLevel || 'project',
            impact: input.impact,
            follow_up_actions: input.followUpActions,
            status: input.status || 'pending',
            due_date: input.dueDate
        }).select().single();
        if (error) throw error;
        return data;
    }

    async updateGovernanceDecision(id: string, input: any) {
        const updates: any = { updated_at: new Date().toISOString() };
        const fm: Record<string, string> = {
            decisionNumber: 'decision_number', title: 'title', description: 'description',
            category: 'category', decision: 'decision', decidedBy: 'decided_by',
            decisionDate: 'decision_date', escalationLevel: 'escalation_level',
            impact: 'impact', followUpActions: 'follow_up_actions',
            status: 'status', dueDate: 'due_date'
        };
        for (const [k, c] of Object.entries(fm)) { if (input[k] !== undefined) updates[c] = input[k]; }
        const { data, error } = await this.db.from('pm_governance').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    async deleteGovernanceDecision(id: string): Promise<boolean> {
        const { error } = await this.db.from('pm_governance').delete().eq('id', id);
        if (error) throw error;
        return true;
    }

    // ═══════════════════════════════════════════════════════════
    // ─── PMBOK 8: SUSTAINABILITY ────────────────────────────────
    // ═══════════════════════════════════════════════════════════

    async getSustainabilityMetrics(projectId: string) {
        const { data, error } = await this.db.from('pm_sustainability')
            .select('*').eq('project_id', projectId).order('dimension', { ascending: true });
        if (error) throw error;
        return data;
    }

    async createSustainabilityMetric(tenantId: string, input: any) {
        const { data, error } = await this.db.from('pm_sustainability').insert({
            tenant_id: tenantId,
            project_id: input.projectId,
            dimension: input.dimension,
            metric_name: input.metricName,
            description: input.description,
            unit: input.unit,
            target_value: input.targetValue,
            actual_value: input.actualValue,
            baseline_value: input.baselineValue,
            measurement_period: input.measurementPeriod,
            data_source: input.dataSource,
            status: input.status || 'on_track',
            notes: input.notes
        }).select().single();
        if (error) throw error;
        return data;
    }

    async updateSustainabilityMetric(id: string, input: any) {
        const updates: any = { updated_at: new Date().toISOString() };
        const fm: Record<string, string> = {
            dimension: 'dimension', metricName: 'metric_name', description: 'description',
            unit: 'unit', targetValue: 'target_value', actualValue: 'actual_value',
            baselineValue: 'baseline_value', measurementPeriod: 'measurement_period',
            dataSource: 'data_source', status: 'status', notes: 'notes'
        };
        for (const [k, c] of Object.entries(fm)) { if (input[k] !== undefined) updates[c] = input[k]; }
        const { data, error } = await this.db.from('pm_sustainability').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    async deleteSustainabilityMetric(id: string): Promise<boolean> {
        const { error } = await this.db.from('pm_sustainability').delete().eq('id', id);
        if (error) throw error;
        return true;
    }

    async generateSustainabilityImpact(projectId: string): Promise<any> {
        const { data: project } = await this.db.from('pm_projects').select('*').eq('id', projectId).single();
        if (!project) throw new Error('Project not found');

        const prompt = `
            You are an expert ESG and Sustainability Consultant (PMBOK 8 aligned).
            Analyze potential sustainability impacts for:
            Project: ${project.name}
            Description: ${project.description || 'N/A'}

            Return ONLY a valid JSON object:
            {
                "metrics": [
                    {
                        "dimension": "environmental | social | governance",
                        "metricName": "Name of the metric",
                        "description": "What this metric measures",
                        "unit": "Measurement unit",
                        "targetValue": number,
                        "baselineValue": number,
                        "measurementPeriod": "monthly | quarterly",
                        "notes": "Context and importance"
                    }
                ]
            }
            Generate 6-9 metrics across all 3 ESG dimensions.
        `;

        try {
            return await this.aiRouter.generateStructuredJSON(prompt);
        } catch (error) {
            this.logger.error("Failed to generate sustainability impact via AI", error);
            throw new Error("AI Sustainability Impact analysis failed.");
        }
    }

    // ═══════════════════════════════════════════════════════════
    // ─── AI GENERATORS (Status Report, Critical Path, Portfolio)
    // ═══════════════════════════════════════════════════════════

    async generateStatusReport(projectId: string): Promise<any> {
        const { data: project } = await this.db.from('pm_projects').select('*').eq('id', projectId).single();
        if (!project) throw new Error('Project not found');

        const { data: tasks } = await this.db.from('pm_tasks')
            .select('title, status, priority, due_date, assignee_id')
            .eq('project_id', projectId)
            .eq('is_archived', false);

        const { data: risks } = await this.db.from('pm_risks')
            .select('title, severity, probability, status')
            .eq('project_id', projectId)
            .order('severity', { ascending: false })
            .limit(5);

        const taskCounts = {
            total: tasks?.length || 0,
            done: tasks?.filter((t: any) => t.status === 'done').length || 0,
            inProgress: tasks?.filter((t: any) => t.status === 'in_progress').length || 0,
            todo: tasks?.filter((t: any) => t.status === 'todo').length || 0,
        };

        const prompt = `
            You are an expert Project Manager generating a weekly status report.
            
            Project: ${project.name}
            Description: ${project.description || 'N/A'}
            Status: ${project.status}
            Budget: $${project.budget || 0} (Spent: $${project.spent || 0})
            Timeline: ${project.start_date || 'N/A'} to ${project.end_date || 'N/A'}
            
            Task Summary: ${JSON.stringify(taskCounts)}
            Recent Tasks: ${JSON.stringify((tasks || []).slice(0, 15))}
            Top Risks: ${JSON.stringify(risks || [])}
            
            Return ONLY a valid JSON object:
            {
                "reportDate": "YYYY-MM-DD",
                "executiveSummary": "2-3 sentence overview",
                "overallHealth": "green | yellow | red",
                "healthScore": number (0-100),
                "accomplishments": ["list of 3-5 key accomplishments this period"],
                "nextPeriodGoals": ["list of 3-5 goals for next period"],
                "blockers": ["list of current blockers, if any"],
                "riskHighlights": [
                    { "risk": "description", "severity": "high|medium|low", "mitigation": "suggested action" }
                ],
                "scheduleAssessment": "on_track | at_risk | behind",
                "budgetAssessment": "on_track | at_risk | over_budget",
                "recommendations": ["actionable recommendations"]
            }
        `;

        try {
            return await this.aiRouter.generateStructuredJSON(prompt);
        } catch (error) {
            this.logger.error("Failed to generate status report via AI", error);
            throw new Error("AI Status Report generation failed.");
        }
    }

    async generateCriticalPath(projectId: string): Promise<any> {
        const { data: project } = await this.db.from('pm_projects').select('*').eq('id', projectId).single();
        if (!project) throw new Error('Project not found');

        const { data: tasks } = await this.db.from('pm_tasks')
            .select('id, title, status, priority, due_date, start_date, story_points, dependencies')
            .eq('project_id', projectId)
            .eq('is_archived', false);

        const prompt = `
            You are an expert Project Scheduler performing Critical Path Method (CPM) analysis.
            
            Project: ${project.name}
            Start: ${project.start_date || 'N/A'}, End: ${project.end_date || 'N/A'}
            
            Tasks: ${JSON.stringify(tasks || [])}
            
            Analyze the tasks, their dependencies, and timelines. Identify the critical path — 
            the longest sequence of dependent tasks that determines the minimum project duration.
            
            Return ONLY a valid JSON object:
            {
                "criticalPathTasks": [
                    {
                        "taskId": "uuid",
                        "taskTitle": "title",
                        "estimatedDays": number,
                        "earliestStart": "YYYY-MM-DD",
                        "latestFinish": "YYYY-MM-DD",
                        "slack": number,
                        "isCritical": true
                    }
                ],
                "totalCriticalPathDuration": number,
                "expectedCompletionDate": "YYYY-MM-DD",
                "scheduleVariance": number,
                "nonCriticalTasks": [
                    { "taskId": "uuid", "taskTitle": "title", "totalFloat": number }
                ],
                "bottlenecks": ["description of schedule bottlenecks"],
                "recommendations": ["schedule optimization suggestions"],
                "riskToTimeline": "low | medium | high",
                "summary": "2-3 sentence CPM analysis summary"
            }
        `;

        try {
            return await this.aiRouter.generateStructuredJSON(prompt);
        } catch (error) {
            this.logger.error("Failed to generate critical path via AI", error);
            throw new Error("AI Critical Path analysis failed.");
        }
    }

    async generatePortfolioAnalysis(tenantId: string): Promise<any> {
        const enriched = await this.getPortfolioSummary(tenantId);

        const portfolioSnapshot = (enriched || []).map((p: any) => ({
            name: p.name,
            status: p.status,
            priority: p.priority,
            budget: p.budget,
            spent: p.spent,
            startDate: p.start_date,
            endDate: p.end_date,
            methodology: p.methodology,
            taskCounts: p.taskCounts,
        }));

        const prompt = `
            You are a senior Portfolio Management Office (PMO) analyst.
            Analyze the following project portfolio and provide strategic insights.
            
            Portfolio Data: ${JSON.stringify(portfolioSnapshot)}
            
            Return ONLY a valid JSON object:
            {
                "overallHealthScore": number (0-100),
                "healthSummary": "1-2 sentence portfolio health summary",
                "risks": [
                    { "risk": "description", "severity": "high|medium|low", "affectedProjects": ["project names"], "mitigation": "suggested action" }
                ],
                "recommendations": [
                    { "title": "short title", "recommendation": "detailed recommendation", "priority": "high|medium|low", "impact": "expected impact" }
                ],
                "resourceInsights": "observations about resource allocation across projects",
                "budgetInsights": "observations about budget patterns and burn rate",
                "scheduleInsights": "observations about timeline risks and schedule adherence",
                "strategicAlignment": "assessment of how well the portfolio aligns to strategic goals",
                "topPerformingProjects": ["names of projects doing well"],
                "atRiskProjects": ["names of projects that need attention"]
            }
        `;

        try {
            return await this.aiRouter.generateStructuredJSON(prompt);
        } catch (error) {
            this.logger.error("Failed to generate portfolio analysis via AI", error);
            throw new Error("AI Portfolio Analysis failed.");
        }
    }

    // ═══════════════════════════════════════════════════════════
    // ─── PORTFOLIO OVERVIEW ─────────────────────────────────────
    // ═══════════════════════════════════════════════════════════

    async getPortfolioSummary(tenantId: string) {
        // Fetch all projects with basic stats
        const { data: projects, error } = await this.db.from('pm_projects')
            .select('id, name, project_number, status, priority, budget, spent, start_date, end_date, methodology, created_at')
            .eq('tenant_id', tenantId)
            .order('created_at', { ascending: false });
        if (error) throw error;

        // For each project, count tasks by status
        const enriched = await Promise.all((projects || []).map(async (p: any) => {
            const { data: tasks } = await this.db.from('pm_tasks')
                .select('status')
                .eq('project_id', p.id)
                .eq('is_archived', false);

            const taskCounts = {
                total: tasks?.length || 0,
                done: tasks?.filter((t: any) => t.status === 'done').length || 0,
                inProgress: tasks?.filter((t: any) => t.status === 'in_progress').length || 0,
                todo: tasks?.filter((t: any) => t.status === 'todo').length || 0,
            };

            return { ...p, taskCounts };
        }));

        return enriched;
    }

    // ═══════════════════════════════════════════════════════════
    // ─── KNOWLEDGE BASE (CROSS-PROJECT LESSONS) ─────────────────
    // ═══════════════════════════════════════════════════════════

    async getAllLessonsLearned(tenantId: string) {
        const { data, error } = await this.db.from('pm_lessons_learned')
            .select('*, project:pm_projects!pm_lessons_learned_project_id_fkey(id, name, project_number)')
            .eq('tenant_id', tenantId)
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    }

    // ═══════════════════════════════════════════════════════════
    // ─── PMBOK 8: PRINCIPLES V8 (6 Consolidated) ────────────────
    // ═══════════════════════════════════════════════════════════

    async getPrinciplesV8(projectId: string) {
        const { data, error } = await this.db.from('pm_principles_v8')
            .select('*').eq('project_id', projectId).order('principle_key', { ascending: true });
        if (error) throw error;
        return data;
    }

    async upsertPrincipleV8(tenantId: string, input: any) {
        const payload = {
            tenant_id: tenantId,
            project_id: input.projectId,
            principle_key: input.principleKey,
            principle_name: input.principleName,
            maturity_level: input.maturityLevel || 'initial',
            score: input.score || 3,
            current_state: input.currentState,
            target_state: input.targetState,
            gap_analysis: input.gapAnalysis,
            action_items: input.actionItems,
            evidence: input.evidence,
            assessed_by: input.assessedBy,
            assessed_date: input.assessedDate || new Date().toISOString().split('T')[0],
            review_cycle: input.reviewCycle || 'quarterly',
            updated_at: new Date().toISOString()
        };
        const { data, error } = await this.db.from('pm_principles_v8')
            .upsert(payload, { onConflict: 'project_id,principle_key' }).select().single();
        if (error) throw error;
        return data;
    }

    async deletePrincipleV8(id: string): Promise<boolean> {
        const { error } = await this.db.from('pm_principles_v8').delete().eq('id', id);
        if (error) throw error;
        return true;
    }

    // ═══════════════════════════════════════════════════════════
    // ─── PMBOK 8: PROCESS CHECKLIST ──────────────────────────────
    // ═══════════════════════════════════════════════════════════

    async getProcessChecklist(projectId: string, processGroup?: string) {
        let query = this.db.from('pm_process_checklist')
            .select('*').eq('project_id', projectId);
        if (processGroup) query = query.eq('process_group', processGroup);
        const { data, error } = await query.order('process_group', { ascending: true }).order('process_name', { ascending: true });
        if (error) throw error;
        return data;
    }

    async upsertProcessChecklistItem(tenantId: string, input: any) {
        const payload = {
            tenant_id: tenantId,
            project_id: input.projectId,
            process_group: input.processGroup,
            process_name: input.processName,
            process_description: input.processDescription,
            is_applicable: input.isApplicable !== undefined ? input.isApplicable : true,
            is_adopted: input.isAdopted !== undefined ? input.isAdopted : false,
            completion_percent: input.completionPercent || 0,
            status: input.status || 'not_started',
            responsible_role: input.responsibleRole,
            deliverables: input.deliverables,
            notes: input.notes,
            evidence_url: input.evidenceUrl,
            reviewed_date: input.reviewedDate,
            updated_at: new Date().toISOString()
        };
        const { data, error } = await this.db.from('pm_process_checklist')
            .upsert(payload, { onConflict: 'project_id,process_group,process_name' }).select().single();
        if (error) throw error;
        return data;
    }

    async updateProcessChecklistItem(id: string, input: any) {
        const updates: any = { updated_at: new Date().toISOString() };
        const fm: Record<string, string> = {
            isApplicable: 'is_applicable', isAdopted: 'is_adopted',
            completionPercent: 'completion_percent', status: 'status',
            responsibleRole: 'responsible_role', deliverables: 'deliverables',
            notes: 'notes', evidenceUrl: 'evidence_url', reviewedDate: 'reviewed_date',
            processDescription: 'process_description'
        };
        for (const [k, c] of Object.entries(fm)) { if (input[k] !== undefined) updates[c] = input[k]; }
        const { data, error } = await this.db.from('pm_process_checklist').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    async deleteProcessChecklistItem(id: string): Promise<boolean> {
        const { error } = await this.db.from('pm_process_checklist').delete().eq('id', id);
        if (error) throw error;
        return true;
    }

    async initializeProcessChecklist(tenantId: string, projectId: string): Promise<any[]> {
        // Initialize all 40 standard PMBOK 8 processes for a project
        const standardProcesses = [
            // Initiating (8 processes)
            { group: 'initiating', name: 'Develop Project Charter', desc: 'Develop a document that formally authorizes the project' },
            { group: 'initiating', name: 'Identify Stakeholders', desc: 'Identify people, groups, or organizations that could impact or be impacted' },
            { group: 'initiating', name: 'Define Business Case', desc: 'Document the business justification for the project' },
            { group: 'initiating', name: 'Establish Governance', desc: 'Define the governance framework and decision authority' },
            { group: 'initiating', name: 'Assess Feasibility', desc: 'Evaluate technical, economic, and operational feasibility' },
            { group: 'initiating', name: 'Define Benefits', desc: 'Identify and document expected benefits and success metrics' },
            { group: 'initiating', name: 'Set Sustainability Goals', desc: 'Establish ESG sustainability objectives for the project' },
            { group: 'initiating', name: 'Compliance Review', desc: 'Review regulatory and organizational compliance needs' },
            // Planning (12 processes)
            { group: 'planning', name: 'Develop Project Plan', desc: 'Define, prepare, and coordinate all plan components' },
            { group: 'planning', name: 'Define Scope', desc: 'Develop a detailed project scope statement' },
            { group: 'planning', name: 'Create WBS', desc: 'Subdivide deliverables into smaller, manageable components' },
            { group: 'planning', name: 'Define Activities', desc: 'Identify and document specific actions to produce deliverables' },
            { group: 'planning', name: 'Estimate Durations', desc: 'Estimate the time needed to complete individual activities' },
            { group: 'planning', name: 'Develop Schedule', desc: 'Analyze activity sequences, durations, and constraints' },
            { group: 'planning', name: 'Plan Cost Management', desc: 'Establish policies and procedures for budgeting and spending' },
            { group: 'planning', name: 'Plan Quality', desc: 'Define quality requirements and standards for deliverables' },
            { group: 'planning', name: 'Plan Resources', desc: 'Estimate and acquire team and physical resources' },
            { group: 'planning', name: 'Plan Communications', desc: 'Develop an approach for project communications' },
            { group: 'planning', name: 'Plan Risk Management', desc: 'Define how risk management activities will be conducted' },
            { group: 'planning', name: 'Plan Procurement', desc: 'Document procurement decisions and identify potential sellers' },
            // Executing (8 processes)
            { group: 'executing', name: 'Direct & Manage Work', desc: 'Lead and perform the work defined in the project plan' },
            { group: 'executing', name: 'Manage Knowledge', desc: 'Use existing knowledge and create new knowledge' },
            { group: 'executing', name: 'Manage Quality', desc: 'Translate quality plan into executable quality activities' },
            { group: 'executing', name: 'Acquire & Develop Team', desc: 'Obtain and develop team members to enhance performance' },
            { group: 'executing', name: 'Manage Communications', desc: 'Ensure timely and appropriate collection and distribution of information' },
            { group: 'executing', name: 'Implement Risk Responses', desc: 'Execute agreed-upon risk response plans' },
            { group: 'executing', name: 'Conduct Procurements', desc: 'Obtain seller responses, select a seller, and award a contract' },
            { group: 'executing', name: 'Manage Stakeholder Engagement', desc: 'Communicate and work with stakeholders to meet their needs' },
            // Monitoring & Controlling (8 processes)
            { group: 'monitoring_controlling', name: 'Monitor & Control Work', desc: 'Track, review, and report overall project progress' },
            { group: 'monitoring_controlling', name: 'Perform Integrated Change Control', desc: 'Review all change requests and manage changes' },
            { group: 'monitoring_controlling', name: 'Validate & Control Scope', desc: 'Formalize acceptance and monitor scope status' },
            { group: 'monitoring_controlling', name: 'Control Schedule', desc: 'Monitor project status and manage changes to the schedule baseline' },
            { group: 'monitoring_controlling', name: 'Control Costs', desc: 'Monitor project status and manage changes to the cost baseline' },
            { group: 'monitoring_controlling', name: 'Control Quality', desc: 'Monitor and record results to assess compliance' },
            { group: 'monitoring_controlling', name: 'Monitor Risks', desc: 'Monitor implementation of risk response plans and track new risks' },
            { group: 'monitoring_controlling', name: 'Monitor Sustainability', desc: 'Track ESG metrics and sustainability compliance' },
            // Closing (4 processes)
            { group: 'closing', name: 'Close Project or Phase', desc: 'Finalize all activities and formally close the project' },
            { group: 'closing', name: 'Capture Lessons Learned', desc: 'Document lessons learned for organizational knowledge' },
            { group: 'closing', name: 'Release Resources', desc: 'Release project resources back to the organization' },
            { group: 'closing', name: 'Archive Project Artifacts', desc: 'Archive all project documents and artifacts' },
        ];

        const results: any[] = [];
        for (const proc of standardProcesses) {
            const { data, error } = await this.db.from('pm_process_checklist')
                .upsert({
                    tenant_id: tenantId,
                    project_id: projectId,
                    process_group: proc.group,
                    process_name: proc.name,
                    process_description: proc.desc,
                    is_applicable: true,
                    is_adopted: false,
                    completion_percent: 0,
                    status: 'not_started',
                    updated_at: new Date().toISOString()
                }, { onConflict: 'project_id,process_group,process_name' }).select().single();
            if (!error && data) results.push(data);
        }
        return results;
    }
}
