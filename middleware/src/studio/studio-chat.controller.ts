import {
    BadRequestException,
    Body,
    Controller,
    Post,
    Req,
    Res,
    UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from '../auth/auth.service';
import { StudioService } from './studio.service';

type ChatStreamBody = {
    notebookId?: string;
    question?: string;
    conversationId?: string;
    sourceIds?: string[];
    language?: string;
};

/**
 * Server-Sent Events endpoint for streaming AI Studio chat answers.
 *
 * The GraphQL `chat` mutation still exists (single-shot); this REST route exists
 * because SSE token streaming does not map cleanly onto a GraphQL mutation.
 * Auth mirrors {@link GqlAuthGuard}: a Bearer token is validated and the
 * notebook/conversation ownership is enforced before any generation runs.
 */
@Controller()
export class StudioChatController {
    constructor(
        private readonly studioService: StudioService,
        private readonly authService: AuthService,
    ) {}

    @Post('studio/chat/stream')
    async stream(
        @Req() req: Request,
        @Res() res: Response,
        @Body() body: ChatStreamBody,
    ): Promise<void> {
        const authHeader = req.headers['authorization'];
        const token = typeof authHeader === 'string' ? authHeader.replace(/^Bearer\s+/i, '').trim() : '';
        if (!token) {
            throw new UnauthorizedException('Authentication required for this operation');
        }

        let userId: string;
        try {
            const user = await this.authService.getUser(token);
            userId = user.id;
        } catch (err) {
            throw new UnauthorizedException(err instanceof Error ? err.message : 'Invalid session');
        }

        const notebookId = body.notebookId?.trim();
        const question = body.question?.trim();
        if (!notebookId) throw new BadRequestException('notebookId is required');
        if (!question) throw new BadRequestException('question is required');

        // Ownership: notebook (and conversation, if continuing) must belong to the caller.
        await this.studioService.assertNotebookOwner(notebookId, userId);
        if (body.conversationId) {
            await this.studioService.assertConversationOwner(body.conversationId, userId);
        }

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache, no-transform');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');
        res.flushHeaders?.();

        const emit = (event: 'meta' | 'delta' | 'done', data: Record<string, unknown>) => {
            res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
        };

        try {
            await this.studioService.chatStream(
                notebookId,
                question,
                body.conversationId,
                userId,
                { sourceIds: body.sourceIds, language: body.language },
                emit,
            );
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Streaming failed';
            res.write(`event: error\ndata: ${JSON.stringify({ message })}\n\n`);
        } finally {
            res.end();
        }
    }
}
