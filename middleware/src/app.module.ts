import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';

import { SupabaseModule } from './supabase/supabase.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PagesModule } from './pages/pages.module';
import { HealthModule } from './health/health.module';
import { BlocksModule } from './blocks/blocks.module';
import { SettingsModule } from './settings/settings.module';
import { MediaModule } from './media/media.module';
import { RagModule } from './rag/rag.module';
import { MLBackendModule } from './ml-backend/ml-backend.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { TenantsModule } from './tenants/tenants.module';
import { PermissionsModule } from './permissions/permissions.module';
import { CrmModule } from './crm/crm.module';
import { AiModule } from './ai/ai.module';
import { PmModule } from './pm/pm.module';
import { StarsModule } from './stars/stars.module';
import { InventoryModule } from './inventory/inventory.module';
import { ItsmModule } from './itsm/itsm.module';
import { StudioModule } from './studio/studio.module';
import { AccountingModule } from './accounting/accounting.module';
import { HrModule } from './hr/hr.module';
import { OpsModule } from './ops/ops.module';
import { NotificationsModule } from './notifications/notifications.module';
import { DremioModule } from './dremio/dremio.module';
import { NewsModule } from './news/news.module';
import { DockerModule } from './docker/docker.module';
import { InfrastructureModule } from './infrastructure/infrastructure.module';
import { EcommerceModule } from './ecommerce/ecommerce.module';
import { EmailModule } from './email/email.module';
import { AuditModule } from './audit/audit.module';
import { SecurityModule } from './security/security.module';
import { AutomationModule } from './automation/automation.module';
import { DevopsModule } from './devops/devops.module';
import { CollaborationModule } from './collaboration/collaboration.module';
import { MessagingModule } from './messaging/messaging.module';
import { DatasetsModule } from './datasets/datasets.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { DocumentsModule } from './documents/documents.module';
import { ReportsModule } from './reports/reports.module';
import { FormsModule } from './forms/forms.module';
@Module({
    imports: [
        // Environment configuration
        ConfigModule.forRoot({
            isGlobal: true,
            // First file wins on duplicate keys (Nest merges with Object.assign(parsed, existing)).
            envFilePath: ['.env.local', '../.env.local', '.env', '../.env'],
        }),
        ScheduleModule.forRoot(),

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
        RagModule,
        MLBackendModule,
        WebhooksModule,
        TenantsModule,
        PermissionsModule,
        CrmModule,
        AiModule,
        PmModule,
        StarsModule,
        InventoryModule,
        ItsmModule,
        StudioModule,
        AccountingModule,
        HrModule,
        OpsModule,
        NotificationsModule,
        DremioModule,
        NewsModule,
        DockerModule,
        InfrastructureModule,
        // v2.19.0 — New modules
        EcommerceModule,
        EmailModule,
        AuditModule,
        SecurityModule,
        AutomationModule,
        DevopsModule,
        CollaborationModule,
        MessagingModule,
        DatasetsModule,
        IntegrationsModule,
        AnalyticsModule,
        DocumentsModule,
        ReportsModule,
        // v3.0 — Form Builder
        FormsModule,
    ],
})
export class AppModule { }
