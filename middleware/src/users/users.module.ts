import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { GqlAuthGuard } from '../auth/gql-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { UsersResolver } from './users.resolver';
import { UsersService } from './users.service';

@Module({
    imports: [AuthModule],
    providers: [UsersResolver, UsersService, GqlAuthGuard, RolesGuard],
    exports: [UsersService],
})
export class UsersModule {}
