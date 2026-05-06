import {
    Resolver, Query, Mutation, Args,
    ObjectType, Field, ID, InputType,
} from '@nestjs/graphql';
import { NotificationsService } from './notifications.service';
import { NotificationDispatcher } from './notification.dispatcher';
import GraphQLJSON from 'graphql-type-json';

// ─── Types ──────────────────────────────────────────────

@ObjectType()
class NotifChannel {
    @Field(() => ID) id: string;
    @Field() tenantId: string;
    @Field() name: string;
    @Field() channelType: string;
    @Field(() => GraphQLJSON, { nullable: true }) config?: any;
    @Field() isActive: boolean;
    @Field() createdAt: string;
}

@ObjectType()
class NotifTemplate {
    @Field(() => ID) id: string;
    @Field() tenantId: string;
    @Field() name: string;
    @Field() channelType: string;
    @Field({ nullable: true }) subject?: string;
    @Field() body: string;
    @Field(() => [String]) variables: string[];
    @Field() isActive: boolean;
    @Field() createdAt: string;
}

@ObjectType()
class NotifRule {
    @Field(() => ID) id: string;
    @Field() tenantId: string;
    @Field() name: string;
    @Field() module: string;
    @Field() event: string;
    @Field({ nullable: true }) channelId?: string;
    @Field({ nullable: true }) templateId?: string;
    @Field() recipientType: string;
    @Field({ nullable: true }) recipientValue?: string;
    @Field(() => GraphQLJSON, { nullable: true }) conditions?: any;
    @Field() isActive: boolean;
    @Field({ nullable: true }) channelName?: string;
    @Field({ nullable: true }) templateName?: string;
    @Field() createdAt: string;
}

@ObjectType()
class Notification {
    @Field(() => ID) id: string;
    @Field() tenantId: string;
    @Field() userId: string;
    @Field() title: string;
    @Field({ nullable: true }) message?: string;
    @Field({ nullable: true }) module?: string;
    @Field({ nullable: true }) link?: string;
    @Field({ nullable: true }) icon?: string;
    @Field() isRead: boolean;
    @Field({ nullable: true }) readAt?: string;
    @Field() createdAt: string;
}

@ObjectType()
class NotifLog {
    @Field(() => ID) id: string;
    @Field() channelType: string;
    @Field() recipient: string;
    @Field({ nullable: true }) subject?: string;
    @Field() status: string;
    @Field({ nullable: true }) errorMessage?: string;
    @Field({ nullable: true }) sentAt?: string;
    @Field() createdAt: string;
}

// ─── Mappers ────────────────────────────────────────────

function mapChannel(d: any): NotifChannel {
    return {
        id: d.id, tenantId: d.tenant_id, name: d.name,
        channelType: d.channel_type, config: d.config,
        isActive: d.is_active, createdAt: d.created_at,
    };
}
function mapTemplate(d: any): NotifTemplate {
    return {
        id: d.id, tenantId: d.tenant_id, name: d.name,
        channelType: d.channel_type, subject: d.subject,
        body: d.body, variables: d.variables || [],
        isActive: d.is_active, createdAt: d.created_at,
    };
}
function mapRule(d: any): NotifRule {
    return {
        id: d.id, tenantId: d.tenant_id, name: d.name,
        module: d.module, event: d.event,
        channelId: d.channel_id, templateId: d.template_id,
        recipientType: d.recipient_type, recipientValue: d.recipient_value,
        conditions: d.conditions, isActive: d.is_active,
        channelName: d.notification_channels?.name,
        templateName: d.notification_templates?.name,
        createdAt: d.created_at,
    };
}
function mapNotification(d: any): Notification {
    return {
        id: d.id, tenantId: d.tenant_id, userId: d.user_id,
        title: d.title, message: d.message, module: d.module,
        link: d.link, icon: d.icon, isRead: d.is_read,
        readAt: d.read_at, createdAt: d.created_at,
    };
}
function mapLog(d: any): NotifLog {
    return {
        id: d.id, channelType: d.channel_type, recipient: d.recipient,
        subject: d.subject, status: d.status,
        errorMessage: d.error_message, sentAt: d.sent_at,
        createdAt: d.created_at,
    };
}

// ─── Resolver ───────────────────────────────────────────

@Resolver()
export class NotificationsResolver {
    constructor(
        private notificationsService: NotificationsService,
        private dispatcher: NotificationDispatcher,
    ) {}

    // Channels
    @Query(() => [NotifChannel])
    async notificationChannels(@Args('tenantId') tenantId: string) {
        return (await this.notificationsService.getChannels(tenantId)).map(mapChannel);
    }

    @Mutation(() => NotifChannel)
    async createNotificationChannel(
        @Args('tenantId') tenantId: string,
        @Args('name') name: string,
        @Args('channelType') channelType: string,
        @Args('config', { type: () => GraphQLJSON, nullable: true }) config?: any,
    ) {
        return mapChannel(await this.notificationsService.createChannel(tenantId, { name, channelType, config }));
    }

    @Mutation(() => NotifChannel)
    async updateNotificationChannel(
        @Args('id') id: string,
        @Args('name', { nullable: true }) name?: string,
        @Args('config', { type: () => GraphQLJSON, nullable: true }) config?: any,
        @Args('isActive', { nullable: true }) isActive?: boolean,
    ) {
        return mapChannel(await this.notificationsService.updateChannel(id, { name, config, isActive }));
    }

    @Mutation(() => Boolean)
    async deleteNotificationChannel(@Args('id') id: string) {
        return this.notificationsService.deleteChannel(id);
    }

    // Templates
    @Query(() => [NotifTemplate])
    async notificationTemplates(@Args('tenantId') tenantId: string) {
        return (await this.notificationsService.getTemplates(tenantId)).map(mapTemplate);
    }

    @Mutation(() => NotifTemplate)
    async createNotificationTemplate(
        @Args('tenantId') tenantId: string,
        @Args('name') name: string,
        @Args('channelType') channelType: string,
        @Args('body') body: string,
        @Args('subject', { nullable: true }) subject?: string,
    ) {
        return mapTemplate(await this.notificationsService.createTemplate(tenantId, { name, channelType, body, subject }));
    }

    @Mutation(() => NotifTemplate)
    async updateNotificationTemplate(
        @Args('id') id: string,
        @Args('name', { nullable: true }) name?: string,
        @Args('subject', { nullable: true }) subject?: string,
        @Args('body', { nullable: true }) body?: string,
        @Args('isActive', { nullable: true }) isActive?: boolean,
    ) {
        return mapTemplate(await this.notificationsService.updateTemplate(id, { name, subject, body, isActive }));
    }

    @Mutation(() => Boolean)
    async deleteNotificationTemplate(@Args('id') id: string) {
        return this.notificationsService.deleteTemplate(id);
    }

    // Rules
    @Query(() => [NotifRule])
    async notificationRules(@Args('tenantId') tenantId: string) {
        return (await this.notificationsService.getRules(tenantId)).map(mapRule);
    }

    @Mutation(() => NotifRule)
    async createNotificationRule(
        @Args('tenantId') tenantId: string,
        @Args('name') name: string,
        @Args('module') module: string,
        @Args('event') event: string,
        @Args('channelId', { nullable: true }) channelId?: string,
        @Args('templateId', { nullable: true }) templateId?: string,
        @Args('recipientType', { nullable: true }) recipientType?: string,
        @Args('recipientValue', { nullable: true }) recipientValue?: string,
    ) {
        return mapRule(await this.notificationsService.createRule(tenantId, {
            name, module, event, channelId, templateId, recipientType, recipientValue,
        }));
    }

    @Mutation(() => NotifRule)
    async updateNotificationRule(
        @Args('id') id: string,
        @Args('name', { nullable: true }) name?: string,
        @Args('module', { nullable: true }) module?: string,
        @Args('event', { nullable: true }) event?: string,
        @Args('isActive', { nullable: true }) isActive?: boolean,
    ) {
        return mapRule(await this.notificationsService.updateRule(id, { name, module, event, isActive }));
    }

    @Mutation(() => Boolean)
    async deleteNotificationRule(@Args('id') id: string) {
        return this.notificationsService.deleteRule(id);
    }

    // Notifications (Inbox)
    @Query(() => [Notification])
    async notifications(
        @Args('tenantId') tenantId: string,
        @Args('userId') userId: string,
        @Args('onlyUnread', { nullable: true }) onlyUnread?: boolean,
    ) {
        return (await this.notificationsService.getNotifications(tenantId, userId, onlyUnread)).map(mapNotification);
    }

    @Mutation(() => Notification)
    async markNotificationRead(@Args('id') id: string) {
        return mapNotification(await this.notificationsService.markNotificationRead(id));
    }

    @Mutation(() => Boolean)
    async markAllNotificationsRead(
        @Args('tenantId') tenantId: string,
        @Args('userId') userId: string,
    ) {
        return this.notificationsService.markAllRead(tenantId, userId);
    }

    @Mutation(() => Notification)
    async createNotification(
        @Args('tenantId') tenantId: string,
        @Args('userId') userId: string,
        @Args('title') title: string,
        @Args('message', { nullable: true }) message?: string,
        @Args('module', { nullable: true }) module?: string,
        @Args('link', { nullable: true }) link?: string,
    ) {
        return mapNotification(await this.notificationsService.createNotification(tenantId, {
            userId, title, message, module, link,
        }));
    }

    // Logs
    @Query(() => [NotifLog])
    async notificationLogs(
        @Args('tenantId') tenantId: string,
        @Args('limit', { nullable: true, defaultValue: 50 }) limit?: number,
    ) {
        return (await this.notificationsService.getNotificationLogs(tenantId, limit)).map(mapLog);
    }

    // ─── Dispatcher Mutations ────────────────────────────

    @Mutation(() => Boolean)
    async sendNotification(
        @Args('tenantId') tenantId: string,
        @Args('channelType') channelType: string,
        @Args('recipient') recipient: string,
        @Args('body') body: string,
        @Args('subject', { nullable: true }) subject?: string,
    ) {
        const result = await this.dispatcher.dispatch({
            tenantId, channelType, recipient, subject, body,
        });
        return result.success;
    }

    @Mutation(() => Boolean)
    async testNotificationChannel(
        @Args('tenantId') tenantId: string,
        @Args('channelId') channelId: string,
        @Args('testRecipient') testRecipient: string,
    ) {
        // Fetch the channel to get its type and config
        const channels = await this.notificationsService.getChannels(tenantId);
        const channel = channels.find((c: any) => c.id === channelId);
        if (!channel) throw new Error('Channel not found');

        const result = await this.dispatcher.dispatch({
            tenantId,
            channelType: channel.channel_type,
            recipient: testRecipient,
            subject: 'Test Notification',
            body: `This is a test notification from Nusantarasoft via ${channel.name} (${channel.channel_type})`,
        });
        return result.success;
    }
}
