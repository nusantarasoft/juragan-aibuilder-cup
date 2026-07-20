import { Module } from '@nestjs/common';
import { AuthResolver } from './auth.resolver';
import { AuthService } from './auth.service';
import { GqlAuthGuard } from './gql-auth.guard';
import { RolesGuard } from './roles.guard';

@Module({
    providers: [AuthResolver, AuthService, GqlAuthGuard, RolesGuard],
    exports: [AuthService, GqlAuthGuard, RolesGuard],
})
export class AuthModule { }
