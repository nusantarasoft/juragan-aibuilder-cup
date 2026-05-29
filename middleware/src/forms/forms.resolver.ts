import {
    Resolver, Query, Mutation, Args,
    ObjectType, Field, ID, InputType, Float, Int,
} from '@nestjs/graphql';
import { FormsService } from './forms.service';
import GraphQLJSON from 'graphql-type-json';

// ─── GraphQL Object Types ──────────────────────────────

@ObjectType()
class FormTemplate {
    @Field(() => ID) id: string;
    @Field() tenantId: string;
    @Field() name: string;
    @Field({ nullable: true }) description?: string;
    @Field() category: string;
    @Field() status: string;
    @Field(() => GraphQLJSON, { nullable: true }) settings?: any;
    @Field(() => GraphQLJSON, { nullable: true }) scoringConfig?: any;
    @Field(() => GraphQLJSON, { nullable: true }) styleConfig?: any;
    @Field(() => Int) version: number;
    @Field(() => GraphQLJSON, { nullable: true }) tags?: any;
    @Field({ nullable: true }) createdBy?: string;
    @Field(() => Int, { nullable: true }) fieldCount?: number;
    @Field(() => [FormField], { nullable: 'itemsAndList' }) fields?: FormField[];
    @Field() createdAt: string;
    @Field() updatedAt: string;
}

@ObjectType()
class FormField {
    @Field(() => ID) id: string;
    @Field() templateId: string;
    @Field({ nullable: true }) sectionId?: string;
    @Field({ nullable: true }) sectionTitle?: string;
    @Field() fieldType: string;
    @Field() label: string;
    @Field({ nullable: true }) description?: string;
    @Field({ nullable: true }) placeholder?: string;
    @Field() isRequired: boolean;
    @Field(() => Int) sortOrder: number;
    @Field(() => GraphQLJSON, { nullable: true }) options?: any;
    @Field(() => GraphQLJSON, { nullable: true }) validation?: any;
    @Field(() => GraphQLJSON, { nullable: true }) kpiConfig?: any;
    @Field(() => GraphQLJSON, { nullable: true }) conditional?: any;
    @Field({ nullable: true }) defaultValue?: string;
    @Field(() => GraphQLJSON, { nullable: true }) metadata?: any;
    @Field() createdAt: string;
    @Field() updatedAt: string;
}

@ObjectType()
class FormAssignment {
    @Field(() => ID) id: string;
    @Field() tenantId: string;
    @Field() templateId: string;
    @Field() assigneeType: string;
    @Field({ nullable: true }) assigneeId?: string;
    @Field({ nullable: true }) assignedBy?: string;
    @Field({ nullable: true }) dueDate?: string;
    @Field() status: string;
    @Field() reminderSent: boolean;
    @Field() createdAt: string;
    @Field() updatedAt: string;
}

@ObjectType()
class FormSubmission {
    @Field(() => ID) id: string;
    @Field() tenantId: string;
    @Field() templateId: string;
    @Field({ nullable: true }) assignmentId?: string;
    @Field({ nullable: true }) submittedBy?: string;
    @Field() status: string;
    @Field(() => Float) totalScore: number;
    @Field(() => Float) maxPossibleScore: number;
    @Field(() => Float) percentage: number;
    @Field({ nullable: true }) grade?: string;
    @Field({ nullable: true }) reviewerId?: string;
    @Field({ nullable: true }) reviewerNotes?: string;
    @Field({ nullable: true }) reviewedAt?: string;
    @Field({ nullable: true }) submittedAt?: string;
    // Joined
    @Field({ nullable: true }) templateName?: string;
    @Field({ nullable: true }) templateCategory?: string;
    @Field(() => [FormFieldValue], { nullable: 'itemsAndList' }) fieldValues?: FormFieldValue[];
    @Field() createdAt: string;
    @Field() updatedAt: string;
}

@ObjectType()
class FormFieldValue {
    @Field(() => ID) id: string;
    @Field() submissionId: string;
    @Field() fieldId: string;
    @Field({ nullable: true }) value?: string;
    @Field(() => Float, { nullable: true }) numericValue?: number;
    @Field(() => GraphQLJSON, { nullable: true }) jsonValue?: any;
    @Field(() => Float) score: number;
    @Field(() => Float) maxScore: number;
    // Joined field info
    @Field({ nullable: true }) fieldLabel?: string;
    @Field({ nullable: true }) fieldType?: string;
    @Field(() => GraphQLJSON, { nullable: true }) fieldKpiConfig?: any;
    @Field(() => GraphQLJSON, { nullable: true }) fieldOptions?: any;
    @Field() createdAt: string;
}

@ObjectType()
class FormScore {
    @Field(() => ID) id: string;
    @Field() tenantId: string;
    @Field() submissionId: string;
    @Field() dimension: string;
    @Field(() => Float) score: number;
    @Field(() => Float) maxScore: number;
    @Field(() => Float) weight: number;
    @Field(() => Float) weightedScore: number;
    @Field({ nullable: true }) notes?: string;
    @Field() createdAt: string;
}

@ObjectType()
class FormAnalytics {
    @Field(() => Int) totalSubmissions: number;
    @Field(() => Int) submittedCount: number;
    @Field(() => Int) approvedCount: number;
    @Field(() => Float) averageScore: number;
    @Field(() => Float) averagePercentage: number;
    @Field(() => Float) completionRate: number;
    @Field(() => GraphQLJSON) gradeDistribution: any;
    @Field(() => GraphQLJSON) statusDistribution: any;
}

// ─── Input Types ────────────────────────────────────────

@InputType()
class CreateFormTemplateInput {
    @Field() name: string;
    @Field({ nullable: true }) description?: string;
    @Field({ nullable: true }) category?: string;
    @Field({ nullable: true }) status?: string;
    @Field(() => GraphQLJSON, { nullable: true }) settings?: any;
    @Field(() => GraphQLJSON, { nullable: true }) scoringConfig?: any;
    @Field(() => GraphQLJSON, { nullable: true }) styleConfig?: any;
    @Field(() => [String], { nullable: true }) tags?: string[];
}

@InputType()
class UpdateFormTemplateInput {
    @Field({ nullable: true }) name?: string;
    @Field({ nullable: true }) description?: string;
    @Field({ nullable: true }) category?: string;
    @Field({ nullable: true }) status?: string;
    @Field(() => GraphQLJSON, { nullable: true }) settings?: any;
    @Field(() => GraphQLJSON, { nullable: true }) scoringConfig?: any;
    @Field(() => GraphQLJSON, { nullable: true }) styleConfig?: any;
    @Field(() => [String], { nullable: true }) tags?: string[];
}

@InputType()
class FormFieldInput {
    @Field({ nullable: true }) id?: string;
    @Field() fieldType: string;
    @Field() label: string;
    @Field({ nullable: true }) description?: string;
    @Field({ nullable: true }) placeholder?: string;
    @Field({ nullable: true }) isRequired?: boolean;
    @Field(() => Int, { nullable: true }) sortOrder?: number;
    @Field(() => GraphQLJSON, { nullable: true }) options?: any;
    @Field(() => GraphQLJSON, { nullable: true }) validation?: any;
    @Field(() => GraphQLJSON, { nullable: true }) kpiConfig?: any;
    @Field(() => GraphQLJSON, { nullable: true }) conditional?: any;
    @Field({ nullable: true }) defaultValue?: string;
    @Field(() => GraphQLJSON, { nullable: true }) metadata?: any;
    @Field({ nullable: true }) sectionId?: string;
    @Field({ nullable: true }) sectionTitle?: string;
}

@InputType()
class FieldValueInput {
    @Field() fieldId: string;
    @Field({ nullable: true }) value?: string;
    @Field(() => Float, { nullable: true }) numericValue?: number;
    @Field(() => GraphQLJSON, { nullable: true }) jsonValue?: any;
}

@InputType()
class SubmitFormInput {
    @Field() templateId: string;
    @Field({ nullable: true }) submittedBy?: string;
    @Field({ nullable: true }) assignmentId?: string;
    @Field(() => [FieldValueInput]) values: FieldValueInput[];
}

@InputType()
class ReviewSubmissionInput {
    @Field() status: string;
    @Field() reviewerId: string;
    @Field({ nullable: true }) notes?: string;
}

@InputType()
class AssigneeInput {
    @Field() assigneeType: string;
    @Field({ nullable: true }) assigneeId?: string;
    @Field({ nullable: true }) dueDate?: string;
}

// ─── Mapper Functions ───────────────────────────────────

function mapTemplate(row: any): FormTemplate {
    return {
        id: row.id, tenantId: row.tenant_id,
        name: row.name, description: row.description,
        category: row.category, status: row.status,
        settings: row.settings, scoringConfig: row.scoring_config,
        styleConfig: row.style_config, version: row.version || 1,
        tags: row.tags, createdBy: row.created_by,
        fieldCount: row.field_count || row.form_fields?.length || 0,
        fields: row.form_fields?.map(mapField) || [],
        createdAt: row.created_at, updatedAt: row.updated_at,
    };
}

function mapField(row: any): FormField {
    return {
        id: row.id, templateId: row.template_id,
        sectionId: row.section_id, sectionTitle: row.section_title,
        fieldType: row.field_type, label: row.label,
        description: row.description, placeholder: row.placeholder,
        isRequired: row.is_required, sortOrder: row.sort_order,
        options: row.options, validation: row.validation,
        kpiConfig: row.kpi_config, conditional: row.conditional,
        defaultValue: row.default_value, metadata: row.metadata,
        createdAt: row.created_at, updatedAt: row.updated_at,
    };
}

function mapAssignment(row: any): FormAssignment {
    return {
        id: row.id, tenantId: row.tenant_id,
        templateId: row.template_id, assigneeType: row.assignee_type,
        assigneeId: row.assignee_id, assignedBy: row.assigned_by,
        dueDate: row.due_date, status: row.status,
        reminderSent: row.reminder_sent,
        createdAt: row.created_at, updatedAt: row.updated_at,
    };
}

function mapSubmission(row: any): FormSubmission {
    return {
        id: row.id, tenantId: row.tenant_id,
        templateId: row.template_id, assignmentId: row.assignment_id,
        submittedBy: row.submitted_by, status: row.status,
        totalScore: parseFloat(row.total_score) || 0,
        maxPossibleScore: parseFloat(row.max_possible_score) || 0,
        percentage: parseFloat(row.percentage) || 0,
        grade: row.grade, reviewerId: row.reviewer_id,
        reviewerNotes: row.reviewer_notes, reviewedAt: row.reviewed_at,
        submittedAt: row.submitted_at,
        templateName: row.form_templates?.name,
        templateCategory: row.form_templates?.category,
        fieldValues: row.form_field_values?.map(mapFieldValue) || [],
        createdAt: row.created_at, updatedAt: row.updated_at,
    };
}

function mapFieldValue(row: any): FormFieldValue {
    return {
        id: row.id, submissionId: row.submission_id,
        fieldId: row.field_id, value: row.value,
        numericValue: row.numeric_value ? parseFloat(row.numeric_value) : null,
        jsonValue: row.json_value, score: parseFloat(row.score) || 0,
        maxScore: parseFloat(row.max_score) || 0,
        fieldLabel: row.form_fields?.label,
        fieldType: row.form_fields?.field_type,
        fieldKpiConfig: row.form_fields?.kpi_config,
        fieldOptions: row.form_fields?.options,
        createdAt: row.created_at,
    };
}

function mapScore(row: any): FormScore {
    return {
        id: row.id, tenantId: row.tenant_id,
        submissionId: row.submission_id, dimension: row.dimension,
        score: parseFloat(row.score) || 0,
        maxScore: parseFloat(row.max_score) || 0,
        weight: parseFloat(row.weight) || 0,
        weightedScore: parseFloat(row.weighted_score) || 0,
        notes: row.notes, createdAt: row.created_at,
    };
}

// ─── Resolver ───────────────────────────────────────────

@Resolver()
export class FormsResolver {
    constructor(private formsService: FormsService) { }

    // ── Templates ──

    @Query(() => [FormTemplate])
    async formTemplates(
        @Args('tenantId') tenantId: string,
        @Args('category', { nullable: true }) category?: string,
        @Args('status', { nullable: true }) status?: string,
        @Args('search', { nullable: true }) search?: string,
    ) {
        return (await this.formsService.getTemplates(tenantId, { category, status, search })).map(mapTemplate);
    }

    @Query(() => FormTemplate)
    async formTemplate(@Args('id') id: string) {
        return mapTemplate(await this.formsService.getTemplate(id));
    }

    @Mutation(() => FormTemplate)
    async createFormTemplate(
        @Args('tenantId') tenantId: string,
        @Args('input') input: CreateFormTemplateInput,
    ) {
        return mapTemplate(await this.formsService.createTemplate(tenantId, input));
    }

    @Mutation(() => FormTemplate)
    async updateFormTemplate(
        @Args('id') id: string,
        @Args('input') input: UpdateFormTemplateInput,
    ) {
        return mapTemplate(await this.formsService.updateTemplate(id, input));
    }

    @Mutation(() => Boolean)
    async deleteFormTemplate(@Args('id') id: string) {
        return this.formsService.deleteTemplate(id);
    }

    @Mutation(() => FormTemplate)
    async duplicateFormTemplate(
        @Args('id') id: string,
        @Args('tenantId') tenantId: string,
    ) {
        return mapTemplate(await this.formsService.duplicateTemplate(id, tenantId));
    }

    @Mutation(() => FormTemplate)
    async publishFormTemplate(@Args('id') id: string) {
        return mapTemplate(await this.formsService.publishTemplate(id));
    }

    // ── Fields ──

    @Query(() => [FormField])
    async formFields(@Args('templateId') templateId: string) {
        return (await this.formsService.getFields(templateId)).map(mapField);
    }

    @Mutation(() => [FormField])
    async saveFormFields(
        @Args('templateId') templateId: string,
        @Args({ name: 'fields', type: () => [FormFieldInput] }) fields: FormFieldInput[],
    ) {
        return (await this.formsService.saveFields(templateId, fields)).map(mapField);
    }

    // ── Assignments ──

    @Query(() => [FormAssignment])
    async formAssignments(@Args('templateId') templateId: string) {
        return (await this.formsService.getAssignments(templateId)).map(mapAssignment);
    }

    @Mutation(() => [FormAssignment])
    async assignForm(
        @Args('tenantId') tenantId: string,
        @Args('templateId') templateId: string,
        @Args({ name: 'assignees', type: () => [AssigneeInput] }) assignees: AssigneeInput[],
        @Args('assignedBy', { nullable: true }) assignedBy?: string,
    ) {
        return (await this.formsService.assignForm(tenantId, templateId, assignees, assignedBy)).map(mapAssignment);
    }

    // ── Submissions ──

    @Query(() => [FormSubmission])
    async formSubmissions(
        @Args('tenantId') tenantId: string,
        @Args('templateId', { nullable: true }) templateId?: string,
        @Args('status', { nullable: true }) status?: string,
        @Args('submittedBy', { nullable: true }) submittedBy?: string,
    ) {
        return (await this.formsService.getSubmissions(tenantId, { templateId, status, submittedBy })).map(mapSubmission);
    }

    @Query(() => FormSubmission)
    async formSubmission(@Args('id') id: string) {
        return mapSubmission(await this.formsService.getSubmission(id));
    }

    @Mutation(() => FormSubmission)
    async submitForm(
        @Args('tenantId') tenantId: string,
        @Args('input') input: SubmitFormInput,
    ) {
        return mapSubmission(await this.formsService.createSubmission(tenantId, input));
    }

    @Mutation(() => FormSubmission)
    async reviewSubmission(
        @Args('id') id: string,
        @Args('input') input: ReviewSubmissionInput,
    ) {
        return mapSubmission(await this.formsService.reviewSubmission(id, input));
    }

    @Mutation(() => Boolean)
    async deleteSubmission(@Args('id') id: string) {
        return this.formsService.deleteSubmission(id);
    }

    // ── Scoring ──

    @Mutation(() => FormSubmission)
    async calculateFormScore(@Args('submissionId') submissionId: string) {
        return mapSubmission(await this.formsService.calculateScore(submissionId));
    }

    @Query(() => [FormScore])
    async formScores(@Args('submissionId') submissionId: string) {
        return (await this.formsService.getScores(submissionId)).map(mapScore);
    }

    // ── Analytics ──

    @Query(() => FormAnalytics)
    async formAnalytics(
        @Args('templateId') templateId: string,
        @Args('tenantId') tenantId: string,
    ) {
        return this.formsService.getAnalytics(templateId, tenantId);
    }
}
