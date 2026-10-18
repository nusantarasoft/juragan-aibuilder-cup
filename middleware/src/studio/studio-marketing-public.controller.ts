import {
    Controller,
    Get,
    Header,
    Param,
    Query,
    Req,
    Res,
    HttpException,
    HttpStatus,
} from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { StudioMarketingService } from './studio-marketing.service';
import { checkMarketingPublicRateLimit } from './studio-marketing-rate-limit';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';

@Public()
@Controller('public/marketing')
export class StudioMarketingPublicController {
    constructor(
        private readonly svc: StudioMarketingService,
        private readonly config: ConfigService,
    ) {}

    private assertRateLimit(req: Request): void {
        const max = Number(this.config.get('STUDIO_MARKETING_PUBLIC_RATE_MAX') ?? 120);
        const windowMs = Number(this.config.get('STUDIO_MARKETING_PUBLIC_RATE_WINDOW_MS') ?? 60_000);
        const ip =
            (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
            req.socket.remoteAddress ||
            'unknown';
        if (!checkMarketingPublicRateLimit(`gallery:${ip}`, max, windowMs)) {
            throw new HttpException('Too many requests', HttpStatus.TOO_MANY_REQUESTS);
        }
    }

    @Get('gallery')
    async listGallery(
        @Req() req: Request,
        @Query('store') store?: string,
        @Query('category') category?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        this.assertRateLimit(req);
        return this.svc.listPublicGallery({
            store,
            category,
            page: page ? Number(page) : undefined,
            limit: limit ? Number(limit) : undefined,
        });
    }

    @Get('gallery/:id')
    async getGalleryItem(@Req() req: Request, @Param('id') id: string) {
        this.assertRateLimit(req);
        return this.svc.getPublicGalleryItem(id);
    }

    @Get('assets/:id')
    @Header('Cache-Control', 'public, max-age=86400')
    async serveAsset(@Req() req: Request, @Param('id') id: string, @Res() res: Response) {
        this.assertRateLimit(req);
        try {
            const buffer = await this.svc.getPublicAssetPng(id);
            res.setHeader('Content-Type', 'image/png');
            res.send(buffer);
        } catch {
            throw new HttpException('Not found', HttpStatus.NOT_FOUND);
        }
    }
}
