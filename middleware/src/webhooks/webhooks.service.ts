import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
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
export class WebhooksService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(WebhooksService.name);
    private pgPool: Pool;

    constructor(private configService: ConfigService) {
        this.pgPool = new Pool({
            connectionString: this.configService.get('SUPABASE_DB_URL'),
        });
    }

    async onModuleInit() {
        try {
            const client = await this.pgPool.connect();
            this.logger.log('WebhooksService: Connected to PostgreSQL pool successfully');
            client.release();
        } catch (error) {
            this.logger.error('WebhooksService: Failed to connect to PostgreSQL pool', error);
        }
    }

    async onModuleDestroy() {
        await this.pgPool.end();
    }

    /**
     * Validate webhook signature from Label Studio
     */
    async validateSignature(signature: string | undefined, payload: any): Promise<boolean> {
        const secret = this.configService.get('LABELSTUDIO_WEBHOOK_SECRET');

        // If no secret configured, skip validation (development mode)
        if (!secret) {
            // Only log this once or on debug to avoid spam
            // this.logger.debug('LABELSTUDIO_WEBHOOK_SECRET not configured, skipping signature validation');
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

            // Upsert into media_annotations table
            const upsertQuery = `
                INSERT INTO media_annotations (
                    media_id,
                    ls_task_id,
                    ls_project_id,
                    annotations,
                    status,
                    annotated_by,
                    updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
                ON CONFLICT (media_id, ls_task_id) DO UPDATE SET
                    annotations = $4,
                    status = $5,
                    annotated_by = $6,
                    updated_at = NOW()
            `;

            await this.pgPool.query(upsertQuery, [
                mediaId,
                task.id,
                project.id,
                JSON.stringify(annotation.result),
                'annotated',
                annotatedBy
            ]);

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
            const updateQuery = `
                UPDATE media_annotations 
                SET status = 'pending', annotations = '[]', updated_at = NOW()
                WHERE ls_task_id = $1 AND ls_project_id = $2
            `;
            await this.pgPool.query(updateQuery, [task.id, project.id]);
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
            const deleteQuery = `
                DELETE FROM media_annotations 
                WHERE ls_task_id = $1 AND ls_project_id = $2
            `;
            await this.pgPool.query(deleteQuery, [task.id, project.id]);
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
            const result = await this.pgPool.query(
                'SELECT media_id FROM media_annotations WHERE ls_task_id = $1 LIMIT 1',
                [taskId]
            );
            return result.rows[0]?.media_id || null;
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
            // Merge with existing tags
            const existingResult = await this.pgPool.query(
                'SELECT metadata FROM media WHERE id = $1',
                [mediaId]
            );

            if (existingResult.rows.length === 0) {
                this.logger.warn(`Media ${mediaId} not found when updating tags`);
                return;
            }

            const existingMetadata = existingResult.rows[0]?.metadata || {};
            const existingTags = existingMetadata.tags || [];

            // Create Set for unique tags
            const mergedTags = [...new Set([...existingTags, ...labels])];

            this.logger.debug(`Updating media ${mediaId} tags. Old: ${existingTags.length}, New: ${labels.length}, Merged: ${mergedTags.length}`);

            const updatedMetadata = {
                ...existingMetadata,
                tags: mergedTags,
                annotation_synced: true,
                annotation_synced_at: new Date().toISOString()
            };

            await this.pgPool.query(
                'UPDATE media SET metadata = $1 WHERE id = $2',
                [updatedMetadata, mediaId]
            );

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
            // Explicitly verify media exists first to avoid FK error if something is wrong
            // (Though media_id comes from RagService which should be valid)

            const query = `
                INSERT INTO media_annotations (
                    media_id,
                    ls_task_id,
                    ls_project_id,
                    predictions,
                    status
                ) VALUES ($1, $2, $3, $4, 'pending')
                ON CONFLICT (media_id, ls_task_id) DO UPDATE SET
                    predictions = $4,
                    updated_at = NOW()
            `;

            await this.pgPool.query(query, [
                mediaId,
                taskId,
                projectId,
                JSON.stringify(predictions)
            ]);

            this.logger.log(`Stored task mapping: media ${mediaId} -> task ${taskId}`);
        } catch (error) {
            this.logger.error('Failed to store task mapping', error);
        }
    }
}
