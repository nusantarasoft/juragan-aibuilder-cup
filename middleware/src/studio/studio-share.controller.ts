import { Controller, Get, Param } from '@nestjs/common';
import { StudioService } from './studio.service';

/**
 * Public, unauthenticated read endpoint for shared Studio notebooks.
 *
 * Access is gated purely by the unguessable share token (see
 * StudioService.getSharedNotebook). Only a read-only projection is returned;
 * there is no way to mutate a notebook through this route. The GraphQL API
 * remains fully guarded — sharing is intentionally the only public surface.
 */
@Controller('studio/shared')
export class StudioShareController {
    constructor(private readonly studioService: StudioService) {}

    @Get(':token')
    async getShared(@Param('token') token: string) {
        return this.studioService.getSharedNotebook(token);
    }
}
