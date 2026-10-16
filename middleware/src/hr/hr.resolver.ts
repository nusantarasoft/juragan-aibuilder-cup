import { Resolver, Query, Mutation, Args, ObjectType, Field, ID, InputType, Float, Int } from '@nestjs/graphql';
import { HrService } from './hr.service';
import GraphQLJSON from 'graphql-type-json';

// ─── ObjectTypes ────────────────────────────────────────

@ObjectType() class HrDepartment {
    @Field(() => ID) id: string;
    @Field() tenantId: string;
    @Field() name: string;
    @Field({ nullable: true }) code?: string;
    @Field({ nullable: true }) description?: string;
    @Field({ nullable: true }) parentId?: string;
    @Field({ nullable: true }) headEmployeeId?: string;
    @Field({ nullable: true }) costCenter?: string;
    @Field({ nullable: true }) status?: string;
    @Field() createdAt: string;
    @Field() updatedAt: string;
}

@ObjectType() class HrPosition {
    @Field(() => ID) id: string;
    @Field() tenantId: string;
    @Field() title: string;
    @Field({ nullable: true }) code?: string;
    @Field({ nullable: true }) departmentId?: string;
    @Field({ nullable: true }) departmentName?: string;
    @Field({ nullable: true }) description?: string;
    @Field({ nullable: true }) grade?: string;
    @Field(() => Float, { nullable: true }) minSalary?: number;
    @Field(() => Float, { nullable: true }) maxSalary?: number;
    @Field({ nullable: true }) currency?: string;
    @Field({ nullable: true }) isActive?: boolean;
    @Field(() => Int, { nullable: true }) headcountBudget?: number;
    @Field() createdAt: string;
    @Field() updatedAt: string;
}

@ObjectType() class HrLeavePersonRef {
    @Field({ nullable: true }) firstName?: string;
    @Field({ nullable: true }) lastName?: string;
}

@ObjectType() class HrLeaveTypeRef {
    @Field({ nullable: true }) name?: string;
    @Field({ nullable: true }) color?: string;
}

@ObjectType() class HrEmployee {
    @Field(() => ID) id: string;
    @Field() tenantId: string;
    @Field() employeeNumber: string;
    @Field() firstName: string;
    @Field() lastName: string;
    @Field({ nullable: true }) email?: string;
    @Field({ nullable: true }) phone?: string;
    @Field({ nullable: true }) dateOfBirth?: string;
    @Field({ nullable: true }) gender?: string;
    @Field({ nullable: true }) maritalStatus?: string;
    @Field({ nullable: true }) nationality?: string;
    @Field({ nullable: true }) nationalId?: string;
    @Field({ nullable: true }) taxId?: string;
    @Field({ nullable: true }) avatarUrl?: string;
    @Field({ nullable: true }) departmentId?: string;
    @Field({ nullable: true }) departmentName?: string;
    @Field({ nullable: true }) positionId?: string;
    @Field({ nullable: true }) positionTitle?: string;
    @Field({ nullable: true }) positionGrade?: string;
    @Field({ nullable: true }) managerId?: string;
    @Field({ nullable: true }) employmentType?: string;
    @Field({ nullable: true }) employmentStatus?: string;
    @Field({ nullable: true }) hireDate?: string;
    @Field({ nullable: true }) probationEndDate?: string;
    @Field({ nullable: true }) terminationDate?: string;
    @Field({ nullable: true }) terminationReason?: string;
    @Field(() => Float, { nullable: true }) baseSalary?: number;
    @Field({ nullable: true }) salaryCurrency?: string;
    @Field({ nullable: true }) bankName?: string;
    @Field({ nullable: true }) bankAccount?: string;
    @Field(() => GraphQLJSON, { nullable: true }) address?: any;
    @Field(() => GraphQLJSON, { nullable: true }) emergencyContact?: any;
    @Field(() => GraphQLJSON, { nullable: true }) tags?: any;
    @Field(() => GraphQLJSON, { nullable: true }) customFields?: any;
    @Field({ nullable: true }) position?: string;
    @Field({ nullable: true }) positionName?: string;
    @Field({ nullable: true }) employeeType?: string;
    @Field({ nullable: true }) status?: string;
    @Field({ nullable: true }) joinDate?: string;
    @Field(() => Float, { nullable: true }) salary?: number;
    @Field({ nullable: true }) profilePicture?: string;
    @Field() createdAt: string;
    @Field() updatedAt: string;
}

@ObjectType() class HrAttendance {
    @Field(() => ID) id: string;
    @Field() employeeId: string;
    @Field({ nullable: true }) employeeName?: string;
    @Field({ nullable: true }) employeeNumber?: string;
    @Field() date: string;
    @Field({ nullable: true }) clockIn?: string;
    @Field({ nullable: true }) clockOut?: string;
    @Field({ nullable: true }) status?: string;
    @Field(() => Float, { nullable: true }) workHours?: number;
    @Field(() => Float, { nullable: true }) overtimeHours?: number;
    @Field({ nullable: true }) notes?: string;
    @Field() createdAt: string;
}

@ObjectType() class HrLeaveType {
    @Field(() => ID) id: string;
    @Field() name: string;
    @Field({ nullable: true }) code?: string;
    @Field(() => Int) daysPerYear: number;
    @Field({ nullable: true }) isPaid?: boolean;
    @Field({ nullable: true }) color?: string;
    @Field({ nullable: true }) isActive?: boolean;
}

@ObjectType() class HrLeaveRequest {
    @Field(() => ID) id: string;
    @Field() employeeId: string;
    @Field({ nullable: true }) employeeName?: string;
    @Field({ nullable: true }) employeeNumber?: string;
    @Field({ nullable: true }) leaveTypeId?: string;
    @Field({ nullable: true }) leaveTypeName?: string;
    @Field({ nullable: true }) leaveTypeColor?: string;
    @Field() startDate: string;
    @Field() endDate: string;
    @Field(() => Int) days: number;
    @Field(() => Int, { nullable: true }) totalDays?: number;
    @Field(() => HrLeavePersonRef, { nullable: true }) employee?: HrLeavePersonRef;
    @Field(() => HrLeaveTypeRef, { nullable: true }) leaveType?: HrLeaveTypeRef;
    @Field({ nullable: true }) reason?: string;
    @Field() status: string;
    @Field({ nullable: true }) approvedBy?: string;
    @Field({ nullable: true }) approvedAt?: string;
    @Field({ nullable: true }) rejectionReason?: string;
    @Field() createdAt: string;
}

@ObjectType() class HrPayrollRun {
    @Field(() => ID) id: string;
    @Field() period: string;
    @Field({ nullable: true }) name?: string;
    @Field() status: string;
    @Field(() => Float) totalGross: number;
    @Field(() => Float) totalDeductions: number;
    @Field(() => Float) totalNet: number;
    @Field(() => Int) employeeCount: number;
    @Field({ nullable: true }) processedAt?: string;
    @Field({ nullable: true }) paidAt?: string;
    @Field() createdAt: string;
}

@ObjectType() class HrPayrollSlip {
    @Field(() => ID) id: string;
    @Field() employeeId: string;
    @Field({ nullable: true }) employeeName?: string;
    @Field(() => Float) baseSalary: number;
    @Field(() => Float) grossSalary: number;
    @Field(() => Float) totalDeductions: number;
    @Field(() => Float) netSalary: number;
    @Field(() => GraphQLJSON, { nullable: true }) components?: any;
    @Field({ nullable: true }) status?: string;
}

@ObjectType() class HrJobPosting {
    @Field(() => ID) id: string;
    @Field() title: string;
    @Field({ nullable: true }) departmentId?: string;
    @Field({ nullable: true }) departmentName?: string;
    @Field({ nullable: true }) description?: string;
    @Field({ nullable: true }) requirements?: string;
    @Field({ nullable: true }) location?: string;
    @Field({ nullable: true }) employmentType?: string;
    @Field(() => Float, { nullable: true }) salaryMin?: number;
    @Field(() => Float, { nullable: true }) salaryMax?: number;
    @Field() status: string;
    @Field({ nullable: true }) postedDate?: string;
    @Field({ nullable: true }) closingDate?: string;
    @Field(() => Int, { nullable: true }) openings?: number;
    @Field() createdAt: string;
}

@ObjectType() class HrApplicant {
    @Field(() => ID) id: string;
    @Field() jobPostingId: string;
    @Field({ nullable: true }) jobTitle?: string;
    @Field() firstName: string;
    @Field() lastName: string;
    @Field({ nullable: true }) email?: string;
    @Field({ nullable: true }) phone?: string;
    @Field({ nullable: true }) source?: string;
    @Field() stage: string;
    @Field(() => Int, { nullable: true }) rating?: number;
    @Field({ nullable: true }) notes?: string;
    @Field({ nullable: true }) interviewDate?: string;
    @Field(() => Float, { nullable: true }) offeredSalary?: number;
    @Field() createdAt: string;
}

@ObjectType() class HrPerformanceReview {
    @Field(() => ID) id: string;
    @Field() employeeId: string;
    @Field({ nullable: true }) employeeName?: string;
    @Field({ nullable: true }) reviewerId?: string;
    @Field({ nullable: true }) reviewPeriod?: string;
    @Field({ nullable: true }) reviewType?: string;
    @Field(() => Int, { nullable: true }) overallRating?: number;
    @Field({ nullable: true }) strengths?: string;
    @Field({ nullable: true }) areasForImprovement?: string;
    @Field({ nullable: true }) comments?: string;
    @Field() status: string;
    @Field({ nullable: true }) completedAt?: string;
    @Field() createdAt: string;
}

@ObjectType() class HrTraining {
    @Field(() => ID) id: string;
    @Field() name: string;
    @Field({ nullable: true }) description?: string;
    @Field({ nullable: true }) category?: string;
    @Field(() => Int, { nullable: true }) durationHours?: number;
    @Field({ nullable: true }) provider?: string;
    @Field(() => Float, { nullable: true }) cost?: number;
    @Field({ nullable: true }) startDate?: string;
    @Field({ nullable: true }) endDate?: string;
    @Field() status: string;
    @Field({ nullable: true }) isMandatory?: boolean;
    @Field({ nullable: true }) certificationName?: string;
    @Field() createdAt: string;
}

@ObjectType() class HrDashboardStats {
    @Field(() => Int) totalEmployees: number;
    @Field(() => Int) activeEmployees: number;
    @Field(() => Int) totalDepartments: number;
    @Field(() => Int) totalPositions: number;
    @Field(() => Int) maleCount: number;
    @Field(() => Int) femaleCount: number;
    @Field(() => Float) totalPayroll: number;
    @Field(() => Float) avgSalary: number;
    @Field(() => Int) pendingLeaveRequests: number;
    @Field(() => Int) totalLeaveRequests: number;
    @Field(() => Int) openJobPostings: number;
    @Field(() => Int) totalApplicants: number;
    @Field(() => Int) totalReviews: number;
    @Field(() => Int) totalTrainings: number;
    @Field(() => Int) newHiresThisMonth: number;
    @Field(() => Int) contractCount: number;
    @Field(() => Int) fullTimeCount: number;
    @Field(() => Float, { nullable: true }) avgTenure?: number;
    @Field(() => Float, { nullable: true }) turnoverRate?: number;
    @Field(() => GraphQLJSON, { nullable: true }) departmentBreakdown?: any;
    @Field(() => GraphQLJSON, { nullable: true }) genderDistribution?: any;
    @Field(() => Float, { nullable: true }) avgAge?: number;
    @Field(() => Int, { nullable: true }) openPositions?: number;
    @Field(() => GraphQLJSON, { nullable: true }) upcomingBirthdays?: any;
    @Field(() => Int, { nullable: true }) totalLeaveToday?: number;
    @Field(() => Float, { nullable: true }) attendanceRateThisMonth?: number;
    @Field(() => Float, { nullable: true }) trainingCompletion?: number;
    @Field(() => Float, { nullable: true }) totalPayrollThisMonth?: number;
    @Field(() => GraphQLJSON, { nullable: true }) probationEnding?: any;
    @Field(() => Float, { nullable: true }) performanceAvg?: number;
}

@ObjectType() class HrLeaveBalance {
    @Field(() => ID) id: string;
    @Field() employeeId: string;
    @Field({ nullable: true }) employeeName?: string;
    @Field({ nullable: true }) employeeNumber?: string;
    @Field({ nullable: true }) leaveTypeId?: string;
    @Field({ nullable: true }) leaveTypeName?: string;
    @Field({ nullable: true }) leaveTypeColor?: string;
    @Field(() => Int) balance: number;
    @Field(() => Int) used: number;
    @Field(() => Int) remaining: number;
    @Field(() => Int, { nullable: true }) carryForward?: number;
    @Field(() => Int) year: number;
}

// ─── InputTypes ─────────────────────────────────────────

@InputType() class CreateEmployeeInput {
    @Field() employeeNumber: string;
    @Field() firstName: string;
    @Field() lastName: string;
    @Field({ nullable: true }) email?: string;
    @Field({ nullable: true }) phone?: string;
    @Field({ nullable: true }) dateOfBirth?: string;
    @Field({ nullable: true }) gender?: string;
    @Field({ nullable: true }) maritalStatus?: string;
    @Field({ nullable: true }) departmentId?: string;
    @Field({ nullable: true }) positionId?: string;
    @Field({ nullable: true }) managerId?: string;
    @Field({ nullable: true }) employmentType?: string;
    @Field() hireDate: string;
    @Field(() => Float, { nullable: true }) baseSalary?: number;
    @Field({ nullable: true }) bankName?: string;
    @Field({ nullable: true }) bankAccount?: string;
}

@InputType() class UpdateEmployeeInput {
    @Field({ nullable: true }) firstName?: string;
    @Field({ nullable: true }) lastName?: string;
    @Field({ nullable: true }) email?: string;
    @Field({ nullable: true }) phone?: string;
    @Field({ nullable: true }) departmentId?: string;
    @Field({ nullable: true }) positionId?: string;
    @Field({ nullable: true }) managerId?: string;
    @Field({ nullable: true }) employmentType?: string;
    @Field({ nullable: true }) employmentStatus?: string;
    @Field(() => Float, { nullable: true }) baseSalary?: number;
    @Field({ nullable: true }) bankName?: string;
    @Field({ nullable: true }) bankAccount?: string;
}

@InputType() class CreateDepartmentInput {
    @Field() name: string;
    @Field({ nullable: true }) code?: string;
    @Field({ nullable: true }) description?: string;
    @Field({ nullable: true }) parentId?: string;
    @Field({ nullable: true }) headEmployeeId?: string;
}

@InputType() class CreatePositionInput {
    @Field() title: string;
    @Field({ nullable: true }) code?: string;
    @Field({ nullable: true }) departmentId?: string;
    @Field({ nullable: true }) grade?: string;
    @Field(() => Float, { nullable: true }) minSalary?: number;
    @Field(() => Float, { nullable: true }) maxSalary?: number;
    @Field(() => Int, { nullable: true }) headcountBudget?: number;
}

@InputType() class CreateLeaveRequestInput {
    @Field() employeeId: string;
    @Field() leaveTypeId: string;
    @Field() startDate: string;
    @Field() endDate: string;
    @Field(() => Int) days: number;
    @Field({ nullable: true }) reason?: string;
}

@InputType() class CreateJobPostingInput {
    @Field() title: string;
    @Field({ nullable: true }) departmentId?: string;
    @Field({ nullable: true }) positionId?: string;
    @Field({ nullable: true }) description?: string;
    @Field({ nullable: true }) location?: string;
    @Field({ nullable: true }) employmentType?: string;
    @Field(() => Float, { nullable: true }) salaryMin?: number;
    @Field(() => Float, { nullable: true }) salaryMax?: number;
    @Field({ nullable: true }) closingDate?: string;
    @Field(() => Int, { nullable: true }) openings?: number;
}

@InputType() class CreateApplicantInput {
    @Field() jobPostingId: string;
    @Field() firstName: string;
    @Field() lastName: string;
    @Field({ nullable: true }) email?: string;
    @Field({ nullable: true }) phone?: string;
    @Field({ nullable: true }) source?: string;
    @Field({ nullable: true }) notes?: string;
}

// ─── Mappers ────────────────────────────────────────────

function mapEmployee(r: any): HrEmployee {
    return {
        id: r.id, tenantId: r.tenant_id, employeeNumber: r.employee_number,
        firstName: r.first_name, lastName: r.last_name, email: r.email, phone: r.phone,
        dateOfBirth: r.date_of_birth, gender: r.gender, maritalStatus: r.marital_status,
        nationality: r.nationality, nationalId: r.national_id, taxId: r.tax_id,
        avatarUrl: r.avatar_url, departmentId: r.department_id,
        departmentName: r.hr_departments?.name, positionId: r.position_id,
        positionTitle: r.hr_positions?.title, positionGrade: r.hr_positions?.grade,
        managerId: r.manager_id, employmentType: r.employment_type,
        employmentStatus: r.employment_status, hireDate: r.hire_date,
        probationEndDate: r.probation_end_date, terminationDate: r.termination_date,
        terminationReason: r.termination_reason, baseSalary: r.base_salary,
        salaryCurrency: r.salary_currency, bankName: r.bank_name, bankAccount: r.bank_account,
        address: r.address, emergencyContact: r.emergency_contact,
        tags: r.tags, customFields: r.custom_fields,
        position: r.hr_positions?.title, positionName: r.hr_positions?.title,
        employeeType: r.employment_type, status: r.employment_status,
        joinDate: r.hire_date, salary: r.base_salary, profilePicture: r.avatar_url,
        createdAt: r.created_at, updatedAt: r.updated_at,
    };
}

function mapDepartment(r: any): HrDepartment {
    return { id: r.id, tenantId: r.tenant_id, name: r.name, code: r.code, description: r.description, parentId: r.parent_id, headEmployeeId: r.head_employee_id, costCenter: r.cost_center, status: r.status, createdAt: r.created_at, updatedAt: r.updated_at };
}

function mapPosition(r: any): HrPosition {
    return { id: r.id, tenantId: r.tenant_id, title: r.title, code: r.code, departmentId: r.department_id, departmentName: r.hr_departments?.name, description: r.description, grade: r.grade, minSalary: r.min_salary, maxSalary: r.max_salary, currency: r.currency, isActive: r.is_active, headcountBudget: r.headcount_budget, createdAt: r.created_at, updatedAt: r.updated_at };
}

function mapLeaveRequest(r: any): HrLeaveRequest {
    const emp = r.hr_employees;
    const lt = r.hr_leave_types;
    return {
        id: r.id, employeeId: r.employee_id,
        employeeName: emp ? `${emp.first_name} ${emp.last_name}` : null,
        employeeNumber: emp?.employee_number,
        employee: emp ? { firstName: emp.first_name, lastName: emp.last_name } : undefined,
        leaveTypeId: r.leave_type_id, leaveTypeName: lt?.name, leaveTypeColor: lt?.color,
        leaveType: lt ? { name: lt.name, color: lt.color } : undefined,
        startDate: r.start_date, endDate: r.end_date, days: r.days, totalDays: r.days,
        reason: r.reason, status: r.status, approvedBy: r.approved_by, approvedAt: r.approved_at,
        rejectionReason: r.rejection_reason, createdAt: r.created_at,
    };
}

function mapAttendance(r: any): HrAttendance {
    return { id: r.id, employeeId: r.employee_id, employeeName: r.hr_employees ? `${r.hr_employees.first_name} ${r.hr_employees.last_name}` : null, employeeNumber: r.hr_employees?.employee_number, date: r.date, clockIn: r.clock_in, clockOut: r.clock_out, status: r.status, workHours: r.work_hours, overtimeHours: r.overtime_hours, notes: r.notes, createdAt: r.created_at };
}

function mapJobPosting(r: any): HrJobPosting {
    return { id: r.id, title: r.title, departmentId: r.department_id, departmentName: r.hr_departments?.name, description: r.description, requirements: r.requirements, location: r.location, employmentType: r.employment_type, salaryMin: r.salary_min, salaryMax: r.salary_max, status: r.status, postedDate: r.posted_date, closingDate: r.closing_date, openings: r.openings, createdAt: r.created_at };
}

function mapApplicant(r: any): HrApplicant {
    return { id: r.id, jobPostingId: r.job_posting_id, jobTitle: r.hr_job_postings?.title, firstName: r.first_name, lastName: r.last_name, email: r.email, phone: r.phone, source: r.source, stage: r.stage, rating: r.rating, notes: r.notes, interviewDate: r.interview_date, offeredSalary: r.offered_salary, createdAt: r.created_at };
}

function mapReview(r: any): HrPerformanceReview {
    const emp = r.hr_employees;
    return { id: r.id, employeeId: r.employee_id, employeeName: emp ? `${emp.first_name} ${emp.last_name}` : null, reviewerId: r.reviewer_id, reviewPeriod: r.review_period, reviewType: r.review_type, overallRating: r.overall_rating, strengths: r.strengths, areasForImprovement: r.areas_for_improvement, comments: r.comments, status: r.status, completedAt: r.completed_at, createdAt: r.created_at };
}

function mapTraining(r: any): HrTraining {
    return { id: r.id, name: r.name, description: r.description, category: r.category, durationHours: r.duration_hours, provider: r.provider, cost: r.cost, startDate: r.start_date, endDate: r.end_date, status: r.status, isMandatory: r.is_mandatory, certificationName: r.certification_name, createdAt: r.created_at };
}

// ─── Resolver ───────────────────────────────────────────

@Resolver()
export class HrResolver {
    constructor(private hrService: HrService) { }

    @Query(() => HrDashboardStats) async hrDashboardStats(@Args('tenantId') tenantId: string) {
        const base = await this.hrService.getDashboardStats(tenantId);
        return {
            ...base,
            avgTenure: 0,
            turnoverRate: 0,
            departmentBreakdown: [],
            genderDistribution: { male: base.maleCount, female: base.femaleCount },
            avgAge: 0,
            openPositions: base.openJobPostings,
            upcomingBirthdays: [],
            totalLeaveToday: 0,
            attendanceRateThisMonth: 0,
            trainingCompletion: 0,
            totalPayrollThisMonth: base.totalPayroll,
            probationEnding: [],
            performanceAvg: 0,
        };
    }

    // Employees
    @Query(() => [HrEmployee]) async hrEmployees(@Args('tenantId') tenantId: string, @Args('departmentId', { nullable: true }) departmentId?: string, @Args('status', { nullable: true }) status?: string, @Args('type', { nullable: true }) type?: string, @Args('search', { nullable: true }) search?: string) { return (await this.hrService.getEmployees(tenantId, { departmentId, status, type, search })).map(mapEmployee); }
    @Query(() => HrEmployee) async hrEmployee(@Args('id') id: string) { return mapEmployee(await this.hrService.getEmployee(id)); }
    @Mutation(() => HrEmployee) async createHrEmployee(@Args('tenantId') tenantId: string, @Args('input') input: CreateEmployeeInput) { return mapEmployee(await this.hrService.createEmployee(tenantId, input)); }
    @Mutation(() => HrEmployee) async updateHrEmployee(@Args('id') id: string, @Args('input') input: UpdateEmployeeInput) { return mapEmployee(await this.hrService.updateEmployee(id, input)); }
    @Mutation(() => Boolean) async deleteHrEmployee(@Args('id') id: string) { return this.hrService.deleteEmployee(id); }

    // Departments
    @Query(() => [HrDepartment]) async hrDepartments(@Args('tenantId') tenantId: string) { return (await this.hrService.getDepartments(tenantId)).map(mapDepartment); }
    @Query(() => HrDepartment) async hrDepartment(@Args('id') id: string) { return mapDepartment(await this.hrService.getDepartment(id)); }
    @Mutation(() => HrDepartment) async createHrDepartment(@Args('tenantId') tenantId: string, @Args('input') input: CreateDepartmentInput) { return mapDepartment(await this.hrService.createDepartment(tenantId, input)); }
    @Mutation(() => Boolean) async deleteHrDepartment(@Args('id') id: string) { return this.hrService.deleteDepartment(id); }

    // Positions
    @Query(() => [HrPosition]) async hrPositions(@Args('tenantId') tenantId: string) { return (await this.hrService.getPositions(tenantId)).map(mapPosition); }
    @Mutation(() => HrPosition) async createHrPosition(@Args('tenantId') tenantId: string, @Args('input') input: CreatePositionInput) { return mapPosition(await this.hrService.createPosition(tenantId, input)); }
    @Mutation(() => Boolean) async deleteHrPosition(@Args('id') id: string) { return this.hrService.deletePosition(id); }

    // Leave
    @Query(() => [HrLeaveType]) async hrLeaveTypes(@Args('tenantId') tenantId: string) { return (await this.hrService.getLeaveTypes(tenantId)).map((r: any) => ({ id: r.id, name: r.name, code: r.code, daysPerYear: r.days_per_year, isPaid: r.is_paid, color: r.color, isActive: r.is_active })); }
    @Query(() => [HrLeaveRequest]) async hrLeaveRequests(@Args('tenantId') tenantId: string, @Args('employeeId', { nullable: true }) employeeId?: string, @Args('status', { nullable: true }) status?: string) { return (await this.hrService.getLeaveRequests(tenantId, { employeeId, status })).map(mapLeaveRequest); }
    @Mutation(() => HrLeaveRequest) async createHrLeaveRequest(@Args('tenantId') tenantId: string, @Args('input') input: CreateLeaveRequestInput) { return mapLeaveRequest(await this.hrService.createLeaveRequest(tenantId, input)); }
    @Mutation(() => HrLeaveRequest) async approveHrLeaveRequest(@Args('id') id: string, @Args('approverId') approverId: string) { return mapLeaveRequest(await this.hrService.approveLeaveRequest(id, approverId)); }
    @Mutation(() => HrLeaveRequest) async rejectHrLeaveRequest(@Args('id') id: string, @Args('reason', { nullable: true }) reason?: string) { return mapLeaveRequest(await this.hrService.rejectLeaveRequest(id, reason)); }

    @Query(() => [HrLeaveBalance]) async hrLeaveBalances(@Args('tenantId') tenantId: string, @Args('employeeId', { nullable: true }) employeeId?: string) { return (await this.hrService.getLeaveBalances(tenantId, { employeeId })).map((r: any) => ({ id: r.id, employeeId: r.employee_id, employeeName: r.hr_employees ? `${r.hr_employees.first_name} ${r.hr_employees.last_name}` : null, employeeNumber: r.hr_employees?.employee_number, leaveTypeId: r.leave_type_id, leaveTypeName: r.hr_leave_types?.name, leaveTypeColor: r.hr_leave_types?.color, balance: r.total_days || 0, used: r.used_days || 0, remaining: (r.total_days || 0) - (r.used_days || 0), carryForward: r.carry_forward_days || 0, year: r.year })); }

    // Attendance
    @Query(() => [HrAttendance]) async hrAttendance(@Args('tenantId') tenantId: string, @Args('employeeId', { nullable: true }) employeeId?: string, @Args('date', { nullable: true }) date?: string, @Args('month', { nullable: true }) month?: string) { return (await this.hrService.getAttendance(tenantId, { employeeId, date, month })).map(mapAttendance); }
    @Mutation(() => HrAttendance) async hrClockIn(@Args('tenantId') tenantId: string, @Args('employeeId') employeeId: string) { return mapAttendance(await this.hrService.clockIn(tenantId, employeeId)); }
    @Mutation(() => HrAttendance) async hrClockOut(@Args('id') id: string) { return mapAttendance(await this.hrService.clockOut(id)); }

    // Payroll
    @Query(() => [HrPayrollRun]) async hrPayrollRuns(@Args('tenantId') tenantId: string) { return (await this.hrService.getPayrollRuns(tenantId)).map((r: any) => ({ id: r.id, period: r.period, name: r.name, status: r.status, totalGross: r.total_gross, totalDeductions: r.total_deductions, totalNet: r.total_net, employeeCount: r.employee_count, processedAt: r.processed_at, paidAt: r.paid_at, createdAt: r.created_at })); }
    @Query(() => [HrPayrollSlip]) async hrPayrollSlips(@Args('runId') runId: string) { return (await this.hrService.getPayrollSlips(runId)).map((r: any) => ({ id: r.id, employeeId: r.employee_id, employeeName: r.employee_name, baseSalary: r.base_salary, grossSalary: r.gross_salary, totalDeductions: r.total_deductions, netSalary: r.net_salary, components: r.components, status: r.status })); }
    @Mutation(() => HrPayrollRun) async createHrPayrollRun(@Args('tenantId') tenantId: string, @Args('period') period: string, @Args('name', { nullable: true }) name?: string) {
        const r = await this.hrService.createPayrollRun(tenantId, { period, name });
        return { id: r.id, period: r.period, name: r.name, status: r.status, totalGross: r.total_gross, totalDeductions: r.total_deductions, totalNet: r.total_net, employeeCount: r.employee_count, processedAt: r.processed_at, paidAt: r.paid_at, createdAt: r.created_at };
    }
    @Mutation(() => HrPayrollRun) async processHrPayrollRun(@Args('id') id: string) {
        const r = await this.hrService.processPayrollRun(id);
        return { id: r.id, period: r.period, name: r.name, status: r.status, totalGross: r.total_gross, totalDeductions: r.total_deductions, totalNet: r.total_net, employeeCount: r.employee_count, processedAt: r.processed_at, paidAt: r.paid_at, createdAt: r.created_at };
    }
    @Mutation(() => HrPayrollRun) async markHrPayrollPaid(@Args('id') id: string) {
        const r = await this.hrService.markPayrollPaid(id);
        return { id: r.id, period: r.period, name: r.name, status: r.status, totalGross: r.total_gross, totalDeductions: r.total_deductions, totalNet: r.total_net, employeeCount: r.employee_count, processedAt: r.processed_at, paidAt: r.paid_at, createdAt: r.created_at };
    }
    @Mutation(() => Boolean) async deleteHrPayrollRun(@Args('id') id: string) { return this.hrService.deletePayrollRun(id); }

    // Recruitment
    @Query(() => [HrJobPosting]) async hrJobPostings(@Args('tenantId') tenantId: string, @Args('status', { nullable: true }) status?: string) { return (await this.hrService.getJobPostings(tenantId, { status })).map(mapJobPosting); }
    @Query(() => [HrApplicant]) async hrApplicants(@Args('tenantId') tenantId: string, @Args('jobPostingId', { nullable: true }) jobPostingId?: string, @Args('stage', { nullable: true }) stage?: string) { return (await this.hrService.getApplicants(tenantId, { jobPostingId, stage })).map(mapApplicant); }
    @Mutation(() => HrJobPosting) async createHrJobPosting(@Args('tenantId') tenantId: string, @Args('input') input: CreateJobPostingInput) { return mapJobPosting(await this.hrService.createJobPosting(tenantId, input)); }
    @Mutation(() => HrApplicant) async createHrApplicant(@Args('tenantId') tenantId: string, @Args('input') input: CreateApplicantInput) { return mapApplicant(await this.hrService.createApplicant(tenantId, input)); }
    @Mutation(() => HrApplicant) async updateHrApplicantStage(@Args('id') id: string, @Args('stage') stage: string) { return mapApplicant(await this.hrService.updateApplicantStage(id, stage)); }

    // Performance
    @Query(() => [HrPerformanceReview]) async hrPerformanceReviews(@Args('tenantId') tenantId: string, @Args('employeeId', { nullable: true }) employeeId?: string) { return (await this.hrService.getPerformanceReviews(tenantId, { employeeId })).map(mapReview); }
    @Mutation(() => HrPerformanceReview) async createHrPerformanceReview(@Args('tenantId') tenantId: string, @Args('employeeId') employeeId: string, @Args('reviewPeriod') reviewPeriod: string, @Args('reviewType', { nullable: true }) reviewType?: string, @Args('overallRating', { type: () => Int, nullable: true }) overallRating?: number, @Args('strengths', { nullable: true }) strengths?: string, @Args('areasForImprovement', { nullable: true }) areasForImprovement?: string, @Args('comments', { nullable: true }) comments?: string) {
        return mapReview(await this.hrService.createPerformanceReview(tenantId, { employeeId, reviewPeriod, reviewType, overallRating, strengths, areasForImprovement, comments }));
    }
    @Mutation(() => HrPerformanceReview) async updateHrPerformanceReview(@Args('id') id: string, @Args('overallRating', { type: () => Int, nullable: true }) overallRating?: number, @Args('strengths', { nullable: true }) strengths?: string, @Args('areasForImprovement', { nullable: true }) areasForImprovement?: string, @Args('comments', { nullable: true }) comments?: string, @Args('status', { nullable: true }) status?: string) {
        return mapReview(await this.hrService.updatePerformanceReview(id, { overallRating, strengths, areasForImprovement, comments, status }));
    }
    @Mutation(() => Boolean) async deleteHrPerformanceReview(@Args('id') id: string) { return this.hrService.deletePerformanceReview(id); }

    // Training
    @Query(() => [HrTraining]) async hrTrainingPrograms(@Args('tenantId') tenantId: string) { return (await this.hrService.getTrainingPrograms(tenantId)).map(mapTraining); }
    @Mutation(() => HrTraining) async createHrTrainingProgram(@Args('tenantId') tenantId: string, @Args('name') name: string, @Args('category', { nullable: true }) category?: string, @Args('description', { nullable: true }) description?: string, @Args('durationHours', { type: () => Int, nullable: true }) durationHours?: number, @Args('provider', { nullable: true }) provider?: string, @Args('cost', { type: () => Float, nullable: true }) cost?: number, @Args('startDate', { nullable: true }) startDate?: string, @Args('endDate', { nullable: true }) endDate?: string, @Args('isMandatory', { nullable: true }) isMandatory?: boolean, @Args('certificationName', { nullable: true }) certificationName?: string) {
        return mapTraining(await this.hrService.createTrainingProgram(tenantId, { name, category, description, durationHours, provider, cost, startDate, endDate, isMandatory, certificationName }));
    }
    @Mutation(() => Boolean) async deleteHrTrainingProgram(@Args('id') id: string) { return this.hrService.deleteTrainingProgram(id); }
}
