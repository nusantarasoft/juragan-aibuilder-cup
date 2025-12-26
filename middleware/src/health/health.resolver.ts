import { Resolver, Query } from '@nestjs/graphql';

@Resolver()
export class HealthResolver {
    @Query(() => String)
    health(): string {
        return 'OK';
    }

    @Query(() => String)
    version(): string {
        return '1.0.0';
    }
}
