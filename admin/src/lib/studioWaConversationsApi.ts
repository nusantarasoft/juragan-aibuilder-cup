import { graphql } from '@/lib/graphqlClient';

export type StudioWaConversation = {
    id: string;
    tenantId: string;
    storeName?: string;
    ownerPhone: string;
    lastMessagePreview?: string;
    lastMessageAt?: string;
    takeoverActive: boolean;
    takeoverByName?: string;
    takeoverUntil?: string;
};

export type StudioWaMessage = {
    id: string;
    authorKind: string;
    bodyText: string;
    authorDisplayName?: string;
    createdAt: string;
};

const CONVERSATIONS_QUERY = `
  query StudioWaConversations {
    studioWaConversations {
      id tenantId storeName ownerPhone lastMessagePreview lastMessageAt
      takeoverActive takeoverByName takeoverUntil
    }
  }
`;

const MESSAGES_QUERY = `
  query StudioWaConversationMessages($conversationId: String!) {
    studioWaConversationMessages(conversationId: $conversationId) {
      id authorKind bodyText authorDisplayName createdAt
    }
  }
`;

export async function fetchStudioWaConversations(): Promise<StudioWaConversation[]> {
    const data = await graphql<{ studioWaConversations: StudioWaConversation[] }>(
        CONVERSATIONS_QUERY,
    );
    return data.studioWaConversations ?? [];
}

export async function fetchStudioWaMessages(conversationId: string): Promise<StudioWaMessage[]> {
    const data = await graphql<{ studioWaConversationMessages: StudioWaMessage[] }>(
        MESSAGES_QUERY,
        { variables: { conversationId } },
    );
    return data.studioWaConversationMessages ?? [];
}

export async function studioWaTakeoverStart(conversationId: string): Promise<void> {
    await graphql(`mutation($conversationId: String!) {
    studioWaTakeoverStart(conversationId: $conversationId)
  }`, { variables: { conversationId } });
}

export async function studioWaTakeoverRelease(conversationId: string): Promise<void> {
    await graphql(`mutation($conversationId: String!) {
    studioWaTakeoverRelease(conversationId: $conversationId)
  }`, { variables: { conversationId } });
}

export async function studioWaHumanReply(conversationId: string, text: string): Promise<void> {
    await graphql(`mutation($conversationId: String!, $text: String!) {
    studioWaHumanReply(conversationId: $conversationId, text: $text) { ok }
  }`, { variables: { conversationId, text } });
}
