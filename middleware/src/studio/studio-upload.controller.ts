import {
    BadRequestException,
    Controller,
    Post,
    ServiceUnavailableException,
    UploadedFile,
    Body,
    UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { StudioService } from './studio.service';

type UploadedMemoryFile = {
    buffer: Buffer;
    originalname: string;
    mimetype: string;
    size: number;
};

/**
 * Plain multipart upload for AI Studio sources (admin uses /studio/upload, not GraphQL multipart).
 */
@Controller()
export class StudioUploadController {
    constructor(private readonly studioService: StudioService) {}

    @Post('studio/upload')
    @UseInterceptors(
        FileInterceptor('file', {
            storage: memoryStorage(),
            limits: { fileSize: 50 * 1024 * 1024 },
        }),
    )
    async uploadNotebookSource(
        @UploadedFile() file: UploadedMemoryFile | undefined,
        @Body('notebookId') notebookId: string | undefined,
    ) {
        if (!notebookId?.trim()) {
            throw new BadRequestException('notebookId is required');
        }
        if (!file?.buffer) {
            throw new BadRequestException('file is required');
        }
        try {
            return await this.studioService.uploadSource(notebookId.trim(), {
                buffer: file.buffer,
                originalname: file.originalname,
                mimetype: file.mimetype,
                size: file.size,
            });
        } catch (e: unknown) {
            const err = e as { code?: string; message?: string };
            const msg = err?.message ?? '';
            if (err?.code === 'ECONNREFUSED' || msg.includes('ECONNREFUSED')) {
                throw new ServiceUnavailableException(
                    'Object storage (MinIO/S3) is not reachable at S3_ENDPOINT. Start MinIO (e.g. `docker compose up -d minio`) and match S3_ENDPOINT in .env / middleware/.env.local.',
                );
            }
            throw e;
        }
    }
}
