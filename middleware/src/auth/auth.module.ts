import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthResolver } from './auth.resolver';
import { AuthService } from './auth.service';
import { GqlAuthGuard } from './gql-auth.guard';
import { GlobalAuthGuard } from './global-auth.guard';
import { RolesGuard } from './roles.guard';

@Module({
    providers: [
        AuthResolver,
        AuthService,
        GqlAuthGuard,
        GlobalAuthGuard,
        RolesGuard,
        { provide: APP_GUARD, useClass: GlobalAuthGuard },
    ],
    exports: [AuthService, GqlAuthGuard, GlobalAuthGuard, RolesGuard],
})
export class AuthModule { }
