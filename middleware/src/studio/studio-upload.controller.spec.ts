import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
    BadRequestException,
    ServiceUnavailableException,
} from '@nestjs/common';
import { StudioUploadController } from './studio-upload.controller';

describe('StudioUploadController', () => {
    const studioService = {
        uploadSource: vi.fn(async () => ({ id: 'src-1' })),
    };
    let ctrl: StudioUploadController;

    const file = {
        buffer: Buffer.from('hello'),
        originalname: 'doc.pdf',
        mimetype: 'application/pdf',
        size: 5,
    };

    beforeEach(() => {
        vi.clearAllMocks();
        ctrl = new StudioUploadController(studioService as any);
    });

    it('mengunggah source dengan notebookId & file valid', async () => {
        const res = await ctrl.uploadNotebookSource(file, ' nb1 ');
        expect(res).toEqual({ id: 'src-1' });
        expect(studioService.uploadSource).toHaveBeenCalledWith('nb1', {
            buffer: file.buffer,
            originalname: 'doc.pdf',
            mimetype: 'application/pdf',
            size: 5,
        });
    });

    it('menolak jika notebookId kosong', async () => {
        await expect(ctrl.uploadNotebookSource(file, '   ')).rejects.toBeInstanceOf(
            BadRequestException,
        );
        await expect(
            ctrl.uploadNotebookSource(file, undefined),
        ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('menolak jika file tidak ada', async () => {
        await expect(
            ctrl.uploadNotebookSource(undefined, 'nb1'),
        ).rejects.toBeInstanceOf(BadRequestException);
        await expect(
            ctrl.uploadNotebookSource({ ...file, buffer: undefined } as any, 'nb1'),
        ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('mengubah ECONNREFUSED (code) menjadi ServiceUnavailable', async () => {
        studioService.uploadSource.mockRejectedValueOnce({ code: 'ECONNREFUSED' });
        await expect(ctrl.uploadNotebookSource(file, 'nb1')).rejects.toBeInstanceOf(
            ServiceUnavailableException,
        );
    });

    it('mengubah ECONNREFUSED (message) menjadi ServiceUnavailable', async () => {
        studioService.uploadSource.mockRejectedValueOnce(
            new Error('connect ECONNREFUSED 127.0.0.1:9000'),
        );
        await expect(ctrl.uploadNotebookSource(file, 'nb1')).rejects.toBeInstanceOf(
            ServiceUnavailableException,
        );
    });

    it('melempar ulang error lain apa adanya', async () => {
        const other = new Error('boom');
        studioService.uploadSource.mockRejectedValueOnce(other);
        await expect(ctrl.uploadNotebookSource(file, 'nb1')).rejects.toBe(other);
    });
});
