import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class StudioWaConversationRow {
    @Field() id!: string;
    @Field() tenantId!: string;
    @Field({ nullable: true }) storeName?: string;
    @Field() ownerPhone!: string;
    @Field({ nullable: true }) lastMessagePreview?: string;
    @Field({ nullable: true }) lastMessageAt?: string;
    @Field() takeoverActive!: boolean;
    @Field({ nullable: true }) takeoverByName?: string;
    @Field({ nullable: true }) takeoverUntil?: string;
}

@ObjectType()
export class StudioWaMessageRow {
    @Field() id!: string;
    @Field() authorKind!: string;
    @Field() bodyText!: string;
    @Field({ nullable: true }) authorDisplayName?: string;
    @Field() createdAt!: string;
}

@ObjectType()
export class StudioWaHandoffStatus {
    @Field() active!: boolean;
    @Field({ nullable: true }) until?: string;
}

@ObjectType()
export class StudioWaHumanReplyResult {
    @Field() ok!: boolean;
    @Field({ nullable: true }) messageId?: string;
}
