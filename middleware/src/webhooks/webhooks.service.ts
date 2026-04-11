import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../supabase/supabase.service';
import { SupabaseClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';

interface AnnotationPayload {
    action: string;
    annotation?: {
        id: number;
        task: number;
        result: Array<{
            from_name: string;
            to_name: string;
            type: string;
            value: any;
        }>;
        completed_by?: {
            id: number;
            email: string;
            first_name?: string;
            last_name?: string;
        };
    };
    project?: {
        id: number;
        title: string;
    };
    task?: {
        id: number;
        data: Record<string, any>;
        meta?: Record<string, any>;
    };
}

@Injectable()
export class WebhooksService implements OnModuleInit {
    private readonly logger = new Logger(WebhooksService.name);
    private supabaseAdmin: SupabaseClient;

    constructor(
        private configService: ConfigService,
        private supabaseService: SupabaseService,
    ) {}

    async onModuleInit() {
        this.supabaseAdmin = this.supabaseService.getAdminClient();
        this.logger.log('WebhooksService: Using Supabase admin client (no direct PG access)');
    }

    /**
     * Validate webhook signature from Label Studio
     */
    async validateSignature(signature: string | undefined, payload: any): Promise<boolean> {
        const secret = this.configService.get('LABELSTUDIO_WEBHOOK_SECRET');

        // If no secret configured, skip validation (development mode)
        if (!secret) {
            return true;
        }

        if (!signature) {
            return false;
        }

        try {
            const expectedSignature = crypto
                .createHmac('sha256', secret)
                .update(JSON.stringify(payload))
                .digest('hex');

            return crypto.timingSafeEqual(
                Buffer.from(signature),
                Buffer.from(expectedSignature)
            );
        } catch (error) {
            this.logger.error('Signature validation failed', error);
            return false;
        }
    }

    /**
     * Handle annotation created/updated events
     */
    async handleAnnotation(payload: AnnotationPayload): Promise<void> {
        const { annotation, project, task } = payload;

        if (!annotation || !task || !project) {
            this.logger.warn('Missing required fields in annotation payload');
            return;
        }

        this.logger.log(`Processing annotation ${annotation.id} for task ${task.id}`);

        try {
            // Extract labels from annotation result
            const labels = this.extractLabelsFromResult(annotation.result);
            const annotatedBy = annotation.completed_by?.email || 'unknown';

            // Find media_id from task data or meta
            // We store media_id in task.meta when sending to Label Studio
            let mediaId = task.meta?.media_id;

            if (!mediaId) {
                this.logger.debug(`media_id not found in task meta, searching DB for task ${task.id}`);
                mediaId = await this.findMediaIdByTaskId(task.id);
            }

            if (!mediaId) {
                this.logger.warn(`Could not find media_id for task ${task.id}`);
                return;
            }

            this.logger.debug(`Found media_id: ${mediaId} for task ${task.id}`);

            // Upsert into media_annotations table via Supabase
            const { error } = await this.supabaseAdmin
                .from('media_annotations')
                .upsert(
                    {
                        media_id: mediaId,
                        ls_task_id: task.id,
                        ls_project_id: project.id,
                        annotations: annotation.result,
                        status: 'annotated',
                        annotated_by: annotatedBy,
                        updated_at: new Date().toISOString(),
                    },
                    { onConflict: 'media_id,ls_task_id' }
                );

            if (error) {
                throw new Error(`Supabase upsert failed: ${error.message}`);
            }

            this.logger.log(`Annotation synced for media ${mediaId}`);

            // Update media metadata with extracted labels
            if (labels.length > 0) {
                await this.updateMediaTags(mediaId, labels);
            }

        } catch (error) {
            this.logger.error('Failed to handle annotation', error);
            throw error;
        }
    }

    /**
     * Handle annotation deleted events
     */
    async handleAnnotationDeleted(payload: AnnotationPayload): Promise<void> {
        const { task, project } = payload;

        if (!task || !project) {
            return;
        }

        this.logger.log(`Annotation deleted for task ${task.id}`);

        try {
            // Update status back to pending
            const { error } = await this.supabaseAdmin
                .from('media_annotations')
                .update({
                    status: 'pending',
                    annotations: [],
                    updated_at: new Date().toISOString(),
                })
                .eq('ls_task_id', task.id)
                .eq('ls_project_id', project.id);

            if (error) {
                throw new Error(`Supabase update failed: ${error.message}`);
            }
        } catch (error) {
            this.logger.error('Failed to handle annotation deletion', error);
        }
    }

    /**
     * Handle task deleted events
     */
    async handleTaskDeleted(payload: AnnotationPayload): Promise<void> {
        const { task, project } = payload;

        if (!task || !project) {
            return;
        }

        this.logger.log(`Task ${task.id} deleted from project ${project.id}`);

        try {
            const { error } = await this.supabaseAdmin
                .from('media_annotations')
                .delete()
                .eq('ls_task_id', task.id)
                .eq('ls_project_id', project.id);

            if (error) {
                throw new Error(`Supabase delete failed: ${error.message}`);
            }
        } catch (error) {
            this.logger.error('Failed to handle task deletion', error);
        }
    }

    /**
     * Extract label strings from Label Studio annotation result
     */
    private extractLabelsFromResult(result: Array<{ type: string; value: any }>): string[] {
        const labels: string[] = [];

        if (!result || !Array.isArray(result)) return [];

        for (const item of result) {
            if (item.type === 'choices' && item.value?.choices) {
                labels.push(...item.value.choices);
            } else if (item.type === 'labels' && item.value?.labels) {
                labels.push(...item.value.labels);
            } else if (item.type === 'taxonomy' && item.value?.taxonomy) {
                // Flatten taxonomy selections
                const flatTaxonomy = item.value.taxonomy.flat(Infinity);
                labels.push(...flatTaxonomy);
            }
        }

        return [...new Set(labels)]; // Deduplicate
    }

    /**
     * Find media_id by searching existing annotations for this task
     * Fallback mechanism if meta wasn't included
     */
    private async findMediaIdByTaskId(taskId: number): Promise<string | null> {
        try {
            const { data, error } = await this.supabaseAdmin
                .from('media_annotations')
                .select('media_id')
                .eq('ls_task_id', taskId)
                .limit(1)
                .single();

            if (error || !data) {
                return null;
            }
            return data.media_id;
        } catch (error) {
            this.logger.error('Failed to find media_id by task_id', error);
            return null;
        }
    }

    /**
     * Update media.metadata.tags with annotation labels
     */
    private async updateMediaTags(mediaId: string, labels: string[]): Promise<void> {
        try {
            // Fetch existing metadata
            const { data: mediaRow, error: fetchError } = await this.supabaseAdmin
                .from('media')
                .select('metadata')
                .eq('id', mediaId)
                .single();

            if (fetchError || !mediaRow) {
                this.logger.warn(`Media ${mediaId} not found when updating tags`);
                return;
            }

            const existingMetadata = mediaRow.metadata || {};
            const existingTags = existingMetadata.tags || [];

            // Create Set for unique tags
            const mergedTags = [...new Set([...existingTags, ...labels])];

            this.logger.debug(`Updating media ${mediaId} tags. Old: ${existingTags.length}, New: ${labels.length}, Merged: ${mergedTags.length}`);

            const updatedMetadata = {
                ...existingMetadata,
                tags: mergedTags,
                annotation_synced: true,
                annotation_synced_at: new Date().toISOString(),
            };

            const { error: updateError } = await this.supabaseAdmin
                .from('media')
                .update({ metadata: updatedMetadata })
                .eq('id', mediaId);

            if (updateError) {
                throw new Error(`Failed to update media metadata: ${updateError.message}`);
            }

            this.logger.log(`Updated media ${mediaId} with ${labels.length} annotation labels`);
        } catch (error) {
            this.logger.error('Failed to update media tags', error);
        }
    }

    /**
     * Store initial task mapping when sending to Label Studio
     * Called by RagService after creating task
     */
    async storeTaskMapping(mediaId: string, taskId: number, projectId: number, predictions: any[]): Promise<void> {
        try {
            const { error } = await this.supabaseAdmin
                .from('media_annotations')
                .upsert(
                    {
                        media_id: mediaId,
                        ls_task_id: taskId,
                        ls_project_id: projectId,
                        predictions: predictions,
                        status: 'pending',
                        updated_at: new Date().toISOString(),
                    },
                    { onConflict: 'media_id,ls_task_id' }
                );

            if (error) {
                throw new Error(`Supabase upsert failed: ${error.message}`);
            }

            this.logger.log(`Stored task mapping: media ${mediaId} -> task ${taskId}`);
        } catch (error) {
            this.logger.error('Failed to store task mapping', error);
        }
    }
}
