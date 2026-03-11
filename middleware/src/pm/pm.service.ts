import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { VertexAiService } from '../ai/vertex-ai.service';

@Injectable()
export class PmService {
    private readonly logger = new Logger(PmService.name);

    constructor(
        private supabaseService: SupabaseService,
        private vertexAi: VertexAiService
    ) { }

    private get db() {
        return this.supabaseService.getAdminClient();
    }

    // ─── PROJECTS ────────────────────────────────────────────

    async getProjects(tenantId: string, filters?: { status?: string; search?: string }) {
        let query = this.db.from('pm_projects')
            .select('*, owner:tenant_users!pm_projects_owner_id_fkey(id, individuals:individuals!tenant_users_individual_id_fkey(first_name, last_name, avatar_url))')
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
            .select('*, owner:tenant_users!pm_projects_owner_id_fkey(id, individuals:individuals!tenant_users_individual_id_fkey(first_name, last_name, avatar_url))')
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
            tags: input.tags || []
        }).select().single();
        if (error) throw error;
        return data;
    }

    async updateProject(id: string, input: any) {
        const updates: any = { updated_at: new Date().toISOString() };
        const fieldMap: Record<string, string> = {
            name: 'name', description: 'description', status: 'status',
            priority: 'priority', startDate: 'start_date', endDate: 'end_date',
            budget: 'budget', spent: 'spent', ownerId: 'owner_id', tags: 'tags'
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
            .select('*, assignee:tenant_users!pm_tasks_assignee_id_fkey(id, users(first_name, last_name, avatar_url))')
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
            .select('*, assignee:tenant_users!pm_tasks_assignee_id_fkey(id, users(first_name, last_name, avatar_url))')
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
            .select('*, user:tenant_users!pm_time_logs_user_id_fkey(id, users(first_name, last_name, avatar_url))')
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
            const description = await this.vertexAi.generateText(prompt);
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
            const analysis = await this.vertexAi.generateStructuredJSON(prompt);
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
            const retrospective = await this.vertexAi.generateText(prompt);
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
            const charterJson = await this.vertexAi.generateStructuredJSON(prompt);
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
            const response = await this.vertexAi.generateStructuredJSON(prompt);
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
            .select('*, owner:tenant_users!pm_risk_registers_owner_id_fkey(id, users(first_name, last_name, avatar_url))')
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
        }).select('*, owner:tenant_users!pm_risk_registers_owner_id_fkey(id, users(first_name, last_name, avatar_url))').single();

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
            .update(updates).eq('id', id).select('*, owner:tenant_users!pm_risk_registers_owner_id_fkey(id, users(first_name, last_name, avatar_url))').single();

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
            const evmJson = await this.vertexAi.generateStructuredJSON(prompt);

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
}
