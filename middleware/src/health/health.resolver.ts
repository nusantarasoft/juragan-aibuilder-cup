import { Resolver, Query } from '@nestjs/graphql';
import { Public } from '../auth/public.decorator';

@Resolver()
export class HealthResolver {
    @Public()
    @Query(() => String)
    health(): string {
        return 'OK';
    }

    @Public()
    @Query(() => String)
    version(): string {
        return '1.0.0';
    }
}
