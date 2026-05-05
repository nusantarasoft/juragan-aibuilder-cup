import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class HrService {
    private readonly logger = new Logger(HrService.name);
    constructor(private supabaseService: SupabaseService) { }
    private get db() { return this.supabaseService.getAdminClient(); }

    // ─── DASHBOARD ──────────────────────────────────────────
    async getDashboardStats(tenantId: string) {
        const [emps, depts, positions, leaves, postings, applicants, reviews, trainings] = await Promise.all([
            this.db.from('hr_employees').select('id, employment_status, employment_type, gender, department_id, hire_date, base_salary', { count: 'exact' }).eq('tenant_id', tenantId),
            this.db.from('hr_departments').select('id', { count: 'exact' }).eq('tenant_id', tenantId).eq('status', 'active'),
            this.db.from('hr_positions').select('id', { count: 'exact' }).eq('tenant_id', tenantId).eq('is_active', true),
            this.db.from('hr_leave_requests').select('id, status', { count: 'exact' }).eq('tenant_id', tenantId),
            this.db.from('hr_job_postings').select('id, status', { count: 'exact' }).eq('tenant_id', tenantId),
            this.db.from('hr_applicants').select('id', { count: 'exact' }).eq('tenant_id', tenantId),
            this.db.from('hr_performance_reviews').select('id', { count: 'exact' }).eq('tenant_id', tenantId),
            this.db.from('hr_training_programs').select('id', { count: 'exact' }).eq('tenant_id', tenantId),
        ]);
        const empData = emps.data || [];
        const active = empData.filter(e => e.employment_status === 'active');
        const totalPayroll = active.reduce((sum, e) => sum + (Number(e.base_salary) || 0), 0);
        const maleCount = active.filter(e => e.gender === 'male').length;
        const femaleCount = active.filter(e => e.gender === 'female').length;
        const pendingLeaves = (leaves.data || []).filter(l => l.status === 'pending').length;
        const openPostings = (postings.data || []).filter(p => p.status === 'open').length;
        return {
            totalEmployees: empData.length, activeEmployees: active.length,
            totalDepartments: depts.count || 0, totalPositions: positions.count || 0,
            maleCount, femaleCount,
            totalPayroll, avgSalary: active.length > 0 ? Math.round(totalPayroll / active.length) : 0,
            pendingLeaveRequests: pendingLeaves, totalLeaveRequests: leaves.count || 0,
            openJobPostings: openPostings, totalApplicants: applicants.count || 0,
            totalReviews: reviews.count || 0, totalTrainings: trainings.count || 0,
            newHiresThisMonth: active.filter(e => { const d = new Date(e.hire_date); const now = new Date(); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); }).length,
            contractCount: active.filter(e => e.employment_type === 'contract').length,
            fullTimeCount: active.filter(e => e.employment_type === 'full_time').length,
        };
    }

    // ─── EMPLOYEES ──────────────────────────────────────────
    async getEmployees(tenantId: string, filters?: { departmentId?: string; status?: string; type?: string; search?: string }) {
        let q = this.db.from('hr_employees').select('*, hr_departments!hr_employees_department_id_fkey(name), hr_positions!hr_employees_position_id_fkey(title)').eq('tenant_id', tenantId);
        if (filters?.departmentId) q = q.eq('department_id', filters.departmentId);
        if (filters?.status) q = q.eq('employment_status', filters.status);
        if (filters?.type) q = q.eq('employment_type', filters.type);
        if (filters?.search) q = q.or(`first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,employee_number.ilike.%${filters.search}%`);
        const { data, error } = await q.order('employee_number');
        if (error) throw error;
        return data;
    }

    async getEmployee(id: string) {
        const { data, error } = await this.db.from('hr_employees').select('*, hr_departments!hr_employees_department_id_fkey(name), hr_positions!hr_employees_position_id_fkey(title, grade)').eq('id', id).single();
        if (error) throw error;
        return data;
    }

    async createEmployee(tenantId: string, input: Record<string, any>) {
        const { data, error } = await this.db.from('hr_employees').insert({
            tenant_id: tenantId, employee_number: input.employeeNumber,
            first_name: input.firstName, last_name: input.lastName,
            email: input.email || null, phone: input.phone || null,
            date_of_birth: input.dateOfBirth || null, gender: input.gender || null,
            marital_status: input.maritalStatus || null, nationality: input.nationality || null,
            national_id: input.nationalId || null, tax_id: input.taxId || null,
            avatar_url: input.avatarUrl || null,
            department_id: input.departmentId || null, position_id: input.positionId || null,
            manager_id: input.managerId || null,
            employment_type: input.employmentType || 'full_time',
            employment_status: input.employmentStatus || 'active',
            hire_date: input.hireDate, probation_end_date: input.probationEndDate || null,
            base_salary: input.baseSalary || null, salary_currency: input.salaryCurrency || 'IDR',
            bank_name: input.bankName || null, bank_account: input.bankAccount || null,
            address: input.address || {}, emergency_contact: input.emergencyContact || {},
            tags: input.tags || [], custom_fields: input.customFields || {},
        }).select().single();
        if (error) throw error;
        return data;
    }

    async updateEmployee(id: string, input: Record<string, any>) {
        const updates: any = { updated_at: new Date().toISOString() };
        const map: Record<string, string> = {
            firstName: 'first_name', lastName: 'last_name', email: 'email', phone: 'phone',
            dateOfBirth: 'date_of_birth', gender: 'gender', maritalStatus: 'marital_status',
            nationality: 'nationality', nationalId: 'national_id', taxId: 'tax_id',
            avatarUrl: 'avatar_url', departmentId: 'department_id', positionId: 'position_id',
            managerId: 'manager_id', employmentType: 'employment_type',
            employmentStatus: 'employment_status', hireDate: 'hire_date',
            probationEndDate: 'probation_end_date', terminationDate: 'termination_date',
            terminationReason: 'termination_reason', baseSalary: 'base_salary',
            salaryCurrency: 'salary_currency', bankName: 'bank_name', bankAccount: 'bank_account',
            address: 'address', emergencyContact: 'emergency_contact',
            tags: 'tags', customFields: 'custom_fields',
        };
        for (const [k, col] of Object.entries(map)) { if (input[k] !== undefined) updates[col] = input[k]; }
        const { data, error } = await this.db.from('hr_employees').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    async deleteEmployee(id: string): Promise<boolean> {
        const { error } = await this.db.from('hr_employees').delete().eq('id', id);
        if (error) throw error;
        return true;
    }

    // ─── DEPARTMENTS ────────────────────────────────────────
    async getDepartments(tenantId: string) {
        const { data, error } = await this.db.from('hr_departments').select('*').eq('tenant_id', tenantId).order('name');
        if (error) throw error;
        return data;
    }

    async getDepartment(id: string) {
        const { data, error } = await this.db.from('hr_departments').select('*').eq('id', id).single();
        if (error) throw error;
        return data;
    }

    async createDepartment(tenantId: string, input: Record<string, any>) {
        const { data, error } = await this.db.from('hr_departments').insert({
            tenant_id: tenantId, name: input.name, code: input.code || null,
            description: input.description || null, parent_id: input.parentId || null,
            head_employee_id: input.headEmployeeId || null, cost_center: input.costCenter || null,
            status: input.status || 'active',
        }).select().single();
        if (error) throw error;
        return data;
    }

    async updateDepartment(id: string, input: Record<string, any>) {
        const updates: any = { updated_at: new Date().toISOString() };
        const map: Record<string, string> = {
            name: 'name', code: 'code', description: 'description', parentId: 'parent_id',
            headEmployeeId: 'head_employee_id', costCenter: 'cost_center', status: 'status',
        };
        for (const [k, col] of Object.entries(map)) { if (input[k] !== undefined) updates[col] = input[k]; }
        const { data, error } = await this.db.from('hr_departments').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    async deleteDepartment(id: string): Promise<boolean> {
        const { error } = await this.db.from('hr_departments').delete().eq('id', id);
        if (error) throw error;
        return true;
    }

    // ─── POSITIONS ──────────────────────────────────────────
    async getPositions(tenantId: string) {
        const { data, error } = await this.db.from('hr_positions').select('*, hr_departments(name)').eq('tenant_id', tenantId).order('title');
        if (error) throw error;
        return data;
    }

    async createPosition(tenantId: string, input: Record<string, any>) {
        const { data, error } = await this.db.from('hr_positions').insert({
            tenant_id: tenantId, title: input.title, code: input.code || null,
            department_id: input.departmentId || null, description: input.description || null,
            grade: input.grade || null, min_salary: input.minSalary || null,
            max_salary: input.maxSalary || null, currency: input.currency || 'IDR',
            is_active: input.isActive ?? true, headcount_budget: input.headcountBudget || 1,
        }).select().single();
        if (error) throw error;
        return data;
    }

    async updatePosition(id: string, input: Record<string, any>) {
        const updates: any = { updated_at: new Date().toISOString() };
        const map: Record<string, string> = {
            title: 'title', code: 'code', departmentId: 'department_id',
            description: 'description', grade: 'grade', minSalary: 'min_salary',
            maxSalary: 'max_salary', currency: 'currency', isActive: 'is_active',
            headcountBudget: 'headcount_budget',
        };
        for (const [k, col] of Object.entries(map)) { if (input[k] !== undefined) updates[col] = input[k]; }
        const { data, error } = await this.db.from('hr_positions').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    async deletePosition(id: string): Promise<boolean> {
        const { error } = await this.db.from('hr_positions').delete().eq('id', id);
        if (error) throw error;
        return true;
    }

    // ─── LEAVE ──────────────────────────────────────────────
    async getLeaveTypes(tenantId: string) {
        const { data, error } = await this.db.from('hr_leave_types').select('*').eq('tenant_id', tenantId).order('name');
        if (error) throw error;
        return data;
    }

    async getLeaveRequests(tenantId: string, filters?: { employeeId?: string; status?: string }) {
        let q = this.db.from('hr_leave_requests').select('*, hr_employees!hr_leave_requests_employee_id_fkey(first_name, last_name, employee_number), hr_leave_types(name, color)').eq('tenant_id', tenantId);
        if (filters?.employeeId) q = q.eq('employee_id', filters.employeeId);
        if (filters?.status) q = q.eq('status', filters.status);
        const { data, error } = await q.order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    }

    async createLeaveRequest(tenantId: string, input: Record<string, any>) {
        const { data, error } = await this.db.from('hr_leave_requests').insert({
            tenant_id: tenantId, employee_id: input.employeeId, leave_type_id: input.leaveTypeId,
            start_date: input.startDate, end_date: input.endDate, days: input.days,
            reason: input.reason || null, status: 'pending',
        }).select().single();
        if (error) throw error;
        return data;
    }

    async approveLeaveRequest(id: string, approverId: string) {
        const { data, error } = await this.db.from('hr_leave_requests').update({
            status: 'approved', approved_by: approverId, approved_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        }).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    async rejectLeaveRequest(id: string, reason?: string) {
        const { data, error } = await this.db.from('hr_leave_requests').update({
            status: 'rejected', rejection_reason: reason || null, updated_at: new Date().toISOString(),
        }).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    async getLeaveBalances(tenantId: string, filters?: { employeeId?: string }) {
        let q = this.db.from('hr_leave_balances').select('*, hr_leave_types(name, color), hr_employees!hr_leave_balances_employee_id_fkey(first_name, last_name, employee_number)').eq('tenant_id', tenantId);
        if (filters?.employeeId) q = q.eq('employee_id', filters.employeeId);
        const { data, error } = await q.order('year', { ascending: false });
        if (error) throw error;
        return data;
    }

    // ─── ATTENDANCE ─────────────────────────────────────────
    async getAttendance(tenantId: string, filters?: { employeeId?: string; date?: string; month?: string }) {
        let q = this.db.from('hr_attendance').select('*, hr_employees(first_name, last_name, employee_number)').eq('tenant_id', tenantId);
        if (filters?.employeeId) q = q.eq('employee_id', filters.employeeId);
        if (filters?.date) q = q.eq('date', filters.date);
        if (filters?.month) q = q.gte('date', `${filters.month}-01`).lte('date', `${filters.month}-31`);
        const { data, error } = await q.order('date', { ascending: false });
        if (error) throw error;
        return data;
    }

    async clockIn(tenantId: string, employeeId: string) {
        const today = new Date().toISOString().split('T')[0];
        const now = new Date().toISOString();
        const { data, error } = await this.db.from('hr_attendance').upsert({
            tenant_id: tenantId, employee_id: employeeId, date: today,
            clock_in: now, status: 'present',
        }, { onConflict: 'employee_id,date' }).select().single();
        if (error) throw error;
        return data;
    }

    async clockOut(id: string) {
        const now = new Date().toISOString();
        const { data: att } = await this.db.from('hr_attendance').select('clock_in').eq('id', id).single();
        let workHours = 0;
        if (att?.clock_in) {
            workHours = Math.round(((new Date(now).getTime() - new Date(att.clock_in).getTime()) / 3600000) * 100) / 100;
        }
        const { data, error } = await this.db.from('hr_attendance').update({
            clock_out: now, work_hours: workHours, overtime_hours: Math.max(0, workHours - 8),
        }).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    // ─── PAYROLL ────────────────────────────────────────────
    async getPayrollRuns(tenantId: string) {
        const { data, error } = await this.db.from('hr_payroll_runs').select('*').eq('tenant_id', tenantId).order('period', { ascending: false });
        if (error) throw error;
        return data;
    }

    async getPayrollSlips(runId: string) {
        const { data, error } = await this.db.from('hr_payroll_slips').select('*').eq('payroll_run_id', runId).order('employee_name');
        if (error) throw error;
        return data;
    }

    async createPayrollRun(tenantId: string, input: { period: string; name?: string }) {
        // Get active employees
        const { data: employees } = await this.db.from('hr_employees').select('id, first_name, last_name, base_salary').eq('tenant_id', tenantId).eq('employment_status', 'active');
        const emps = employees || [];
        let totalGross = 0, totalDeductions = 0, totalNet = 0;
        emps.forEach(e => { totalGross += Number(e.base_salary) || 0; });
        // Estimate deductions (30% of gross for tax + social security)
        totalDeductions = Math.round(totalGross * 0.3);
        totalNet = totalGross - totalDeductions;

        const { data: run, error } = await this.db.from('hr_payroll_runs').insert({
            tenant_id: tenantId, period: input.period, name: input.name || `Payroll ${input.period}`,
            status: 'draft', total_gross: totalGross, total_deductions: totalDeductions,
            total_net: totalNet, employee_count: emps.length,
        }).select().single();
        if (error) throw error;

        // Generate payroll slips for each employee
        const slips = emps.map(e => {
            const base = Number(e.base_salary) || 0;
            const pph21 = Math.round(base * 0.15);
            const bpjsKes = Math.round(base * 0.04);
            const bpjsTK = Math.round(base * 0.0577);
            const otherDed = Math.round(base * 0.02);
            const totalDed = pph21 + bpjsKes + bpjsTK + otherDed;
            return {
                payroll_run_id: run.id, employee_id: e.id,
                employee_name: `${e.first_name} ${e.last_name || ''}`.trim(),
                base_salary: base, gross_salary: base,
                total_deductions: totalDed, net_salary: base - totalDed,
                components: { pph21, bpjsKesehatan: bpjsKes, bpjsKetenagakerjaan: bpjsTK, other: otherDed },
                status: 'draft',
            };
        });
        if (slips.length > 0) {
            await this.db.from('hr_payroll_slips').insert(slips);
        }
        return run;
    }

    async processPayrollRun(id: string) {
        const { data, error } = await this.db.from('hr_payroll_runs').update({
            status: 'processing', processed_at: new Date().toISOString(),
        }).eq('id', id).select().single();
        if (error) throw error;
        // Mark slips as processing
        await this.db.from('hr_payroll_slips').update({ status: 'processing' }).eq('payroll_run_id', id);
        // Auto-complete after processing
        await this.db.from('hr_payroll_runs').update({ status: 'completed' }).eq('id', id);
        await this.db.from('hr_payroll_slips').update({ status: 'completed' }).eq('payroll_run_id', id);
        return { ...data, status: 'completed' };
    }

    async markPayrollPaid(id: string) {
        const { data, error } = await this.db.from('hr_payroll_runs').update({
            status: 'paid', paid_at: new Date().toISOString(),
        }).eq('id', id).select().single();
        if (error) throw error;
        await this.db.from('hr_payroll_slips').update({ status: 'paid' }).eq('payroll_run_id', id);
        return data;
    }

    async deletePayrollRun(id: string) {
        await this.db.from('hr_payroll_slips').delete().eq('payroll_run_id', id);
        const { error } = await this.db.from('hr_payroll_runs').delete().eq('id', id);
        if (error) throw error;
        return true;
    }

    // ─── RECRUITMENT ────────────────────────────────────────
    async getJobPostings(tenantId: string, filters?: { status?: string }) {
        let q = this.db.from('hr_job_postings').select('*, hr_departments(name)').eq('tenant_id', tenantId);
        if (filters?.status) q = q.eq('status', filters.status);
        const { data, error } = await q.order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    }

    async getApplicants(tenantId: string, filters?: { jobPostingId?: string; stage?: string }) {
        let q = this.db.from('hr_applicants').select('*, hr_job_postings(title)').eq('tenant_id', tenantId);
        if (filters?.jobPostingId) q = q.eq('job_posting_id', filters.jobPostingId);
        if (filters?.stage) q = q.eq('stage', filters.stage);
        const { data, error } = await q.order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    }

    async updateApplicantStage(id: string, stage: string) {
        const { data, error } = await this.db.from('hr_applicants').update({
            stage, updated_at: new Date().toISOString(),
        }).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    async createJobPosting(tenantId: string, input: Record<string, any>) {
        const { data, error } = await this.db.from('hr_job_postings').insert({
            tenant_id: tenantId, title: input.title,
            department_id: input.departmentId || null, position_id: input.positionId || null,
            description: input.description || null, requirements: input.requirements || null,
            location: input.location || null, employment_type: input.employmentType || 'full_time',
            salary_min: input.salaryMin || null, salary_max: input.salaryMax || null,
            currency: input.currency || 'IDR', status: input.status || 'open',
            posted_date: input.postedDate || new Date().toISOString().split('T')[0],
            closing_date: input.closingDate || null,
            hiring_manager_id: input.hiringManagerId || null, openings: input.openings || 1,
        }).select().single();
        if (error) throw error;
        return data;
    }

    async createApplicant(tenantId: string, input: Record<string, any>) {
        const { data, error } = await this.db.from('hr_applicants').insert({
            tenant_id: tenantId, job_posting_id: input.jobPostingId,
            first_name: input.firstName, last_name: input.lastName,
            email: input.email || null, phone: input.phone || null,
            resume_url: input.resumeUrl || null, cover_letter: input.coverLetter || null,
            source: input.source || null, stage: 'applied', rating: input.rating || null,
            notes: input.notes || null,
        }).select().single();
        if (error) throw error;
        return data;
    }

    // ─── PERFORMANCE ────────────────────────────────────────
    async getPerformanceReviews(tenantId: string, filters?: { employeeId?: string }) {
        let q = this.db.from('hr_performance_reviews').select('*, hr_employees!hr_performance_reviews_employee_id_fkey(first_name, last_name)').eq('tenant_id', tenantId);
        if (filters?.employeeId) q = q.eq('employee_id', filters.employeeId);
        const { data, error } = await q.order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    }

    async createPerformanceReview(tenantId: string, input: any) {
        const { data, error } = await this.db.from('hr_performance_reviews').insert({
            tenant_id: tenantId, employee_id: input.employeeId,
            review_period: input.reviewPeriod, review_type: input.reviewType || 'annual',
            overall_rating: input.overallRating || null,
            strengths: input.strengths || null, areas_for_improvement: input.areasForImprovement || null,
            comments: input.comments || null, status: input.status || 'draft',
        }).select('*, hr_employees!hr_performance_reviews_employee_id_fkey(first_name, last_name)').single();
        if (error) throw error;
        return data;
    }

    async updatePerformanceReview(id: string, input: any) {
        const updates: any = {};
        if (input.overallRating !== undefined) updates.overall_rating = input.overallRating;
        if (input.strengths !== undefined) updates.strengths = input.strengths;
        if (input.areasForImprovement !== undefined) updates.areas_for_improvement = input.areasForImprovement;
        if (input.comments !== undefined) updates.comments = input.comments;
        if (input.status) {
            updates.status = input.status;
            if (input.status === 'completed') updates.completed_at = new Date().toISOString();
        }
        const { data, error } = await this.db.from('hr_performance_reviews').update(updates).eq('id', id)
            .select('*, hr_employees!hr_performance_reviews_employee_id_fkey(first_name, last_name)').single();
        if (error) throw error;
        return data;
    }

    async deletePerformanceReview(id: string) {
        const { error } = await this.db.from('hr_performance_reviews').delete().eq('id', id);
        if (error) throw error;
        return true;
    }

    // ─── TRAINING ───────────────────────────────────────────
    async getTrainingPrograms(tenantId: string) {
        const { data, error } = await this.db.from('hr_training_programs').select('*').eq('tenant_id', tenantId).order('start_date', { ascending: false });
        if (error) throw error;
        return data;
    }

    async createTrainingProgram(tenantId: string, input: any) {
        const { data, error } = await this.db.from('hr_training_programs').insert({
            tenant_id: tenantId, name: input.name, description: input.description || null,
            category: input.category || 'technical', duration_hours: input.durationHours || 0,
            provider: input.provider || null, cost: input.cost || 0,
            start_date: input.startDate || null, end_date: input.endDate || null,
            status: input.status || 'upcoming', is_mandatory: input.isMandatory || false,
            certification_name: input.certificationName || null,
        }).select().single();
        if (error) throw error;
        return data;
    }

    async deleteTrainingProgram(id: string) {
        await this.db.from('hr_training_enrollments').delete().eq('training_id', id);
        const { error } = await this.db.from('hr_training_programs').delete().eq('id', id);
        if (error) throw error;
        return true;
    }

    async getTrainingEnrollments(trainingId: string) {
        const { data, error } = await this.db.from('hr_training_enrollments').select('*, hr_employees(first_name, last_name)').eq('training_id', trainingId);
        if (error) throw error;
        return data;
    }
}

