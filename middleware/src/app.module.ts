import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { ConfigModule } from '@nestjs/config';

import { SupabaseModule } from './supabase/supabase.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PagesModule } from './pages/pages.module';
import { HealthModule } from './health/health.module';
import { BlocksModule } from './blocks/blocks.module';
import { SettingsModule } from './settings/settings.module';
import { MediaModule } from './media/media.module';

@Module({
    imports: [
        // Environment configuration
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: ['.env', '../.env'],
        }),

        // GraphQL configuration (Code-First)
        GraphQLModule.forRoot<ApolloDriverConfig>({
            driver: ApolloDriver,
            autoSchemaFile: true,
            sortSchema: true,
            playground: true,
            introspection: true,
            context: ({ req, res }) => ({ req, res }),
        }),

        // Feature modules
        SupabaseModule,
        AuthModule,
        UsersModule,
        PagesModule,
        HealthModule,
        BlocksModule,
        SettingsModule,
        MediaModule,
    ],
})
export class AppModule { }
