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
import { DcimModule } from './dcim/dcim.module';
import { BmsModule } from './bms/bms.module';
import { ScadaModule } from './scada/scada.module';
import { BimModule } from './bim/bim.module';
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
import { WhatsAppProviderModule } from './whatsapp/whatsapp-provider.module';
import { FacilityModule } from './facility/facility.module';
import { PentestModule } from './pentest/pentest.module';
import { AgenticOsModule } from './agentic-os/agentic-os.module';
import { OnboardingModule } from './onboarding/onboarding.module';
@Module({
    imports: [
        // Environment configuration
        ConfigModule.forRoot({
            isGlobal: true,
            // First file wins on duplicate keys (Nest merges with Object.assign(parsed, existing)).
            envFilePath: ['.env.local', '../.env.local', '.env', '../.env'],
        }),
        WhatsAppProviderModule,
        ScheduleModule.forRoot(),

        // GraphQL configuration (Code-First)
        GraphQLModule.forRoot<ApolloDriverConfig>({
            driver: ApolloDriver,
            autoSchemaFile: true,
            sortSchema: true,
            subscriptions: {
                'graphql-ws': {
                    onConnect: (ctx: { connectionParams?: Record<string, unknown> }) => {
                        const raw = ctx.connectionParams?.authorization ?? ctx.connectionParams?.Authorization;
                        const token = typeof raw === 'string' ? raw : '';
                        return {
                            req: {
                                headers: token ? { authorization: token.startsWith('Bearer ') ? token : `Bearer ${token}` } : {},
                            },
                        };
                    },
                },
            },
            playground:
                process.env.GRAPHQL_PLAYGROUND === 'true' ||
                (process.env.NODE_ENV !== 'production' &&
                    process.env.GRAPHQL_PLAYGROUND !== 'false'),
            introspection:
                process.env.GRAPHQL_INTROSPECTION === 'true' ||
                (process.env.NODE_ENV !== 'production' &&
                    process.env.GRAPHQL_INTROSPECTION !== 'false'),
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
        DcimModule,
        BmsModule,
        ScadaModule,
        BimModule,
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
        FacilityModule,
        PentestModule,
        // Agentic OS (agents, playbooks, task queue, memory, pulse, governance)
        AgenticOsModule,
        OnboardingModule,
    ],
})
export class AppModule { }
