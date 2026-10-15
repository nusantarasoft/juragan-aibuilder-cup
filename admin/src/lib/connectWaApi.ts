import { graphql } from "@/lib/graphqlClient";

export type WaConnectionStatus = {
    storeId: string;
    studioSlug: string;
    ownerPhone?: string | null;
    ownerPhoneVerified: boolean;
    kasirWaActivated: boolean;
    waConnected: boolean;
    staffCount: number;
    maxStaff: number;
    sharedInbox: boolean;
};

export async function fetchMyTenantStore(): Promise<{
    id: string;
    displayName: string;
    studioSlug: string;
    tenantId: string;
} | null> {
    const data = await graphql<{ myTenantStore: { id: string; displayName: string; studioSlug: string; tenantId: string } | null }>(
        `query { myTenantStore { id displayName studioSlug tenantId } }`,
    );
    return data.myTenantStore;
}

export async function fetchWaConnectionStatus(storeId: string): Promise<WaConnectionStatus> {
    const data = await graphql<{ waConnectionStatus: WaConnectionStatus }>(
        `query($storeId: String!) { waConnectionStatus(storeId: $storeId) {
      storeId studioSlug ownerPhone ownerPhoneVerified kasirWaActivated waConnected staffCount maxStaff sharedInbox
    } }`,
        { variables: { storeId } },
    );
    return data.waConnectionStatus;
}

export async function requestOwnerWaOtp(storeId: string, phone: string) {
    const data = await graphql<{
        requestOwnerWaOtp: { phone: string; delivery: string; mockCode?: string; message: string };
    }>(
        `mutation($input: RequestOwnerWaOtpInput!) { requestOwnerWaOtp(input: $input) {
      phone delivery mockCode message
    } }`,
        { variables: { input: { storeId, phone } } },
    );
    return data.requestOwnerWaOtp;
}

export async function verifyOwnerWaOtp(storeId: string, phone: string, code: string) {
    const data = await graphql<{ verifyOwnerWaOtp: WaConnectionStatus }>(
        `mutation($input: VerifyOwnerWaOtpInput!) { verifyOwnerWaOtp(input: $input) {
      storeId ownerPhoneVerified kasirWaActivated waConnected ownerPhone
    } }`,
        { variables: { input: { storeId, phone, code } } },
    );
    return data.verifyOwnerWaOtp;
}

export async function activateWaKasirChannel(storeId: string) {
    const data = await graphql<{ activateWaKasirChannel: WaConnectionStatus }>(
        `mutation($input: ActivateWaKasirInput!) { activateWaKasirChannel(input: $input) {
      waConnected kasirWaActivated ownerPhoneVerified
    } }`,
        { variables: { input: { storeId } } },
    );
    return data.activateWaKasirChannel;
}

export async function addWaStaff(storeId: string, phone: string, label?: string) {
    await graphql(
        `mutation($input: AddWaStaffInput!) { addWaWhitelistStaff(input: $input) { id phone } }`,
        { variables: { input: { storeId, phone, label } } },
    );
}

export async function fetchWaWhitelist(storeId: string) {
    const data = await graphql<{
        waWhitelist: { id: string; phone: string; label?: string; isOwner: boolean }[];
    }>(`query($storeId: String!) { waWhitelist(storeId: $storeId) { id phone label isOwner } }`, {
        variables: { storeId },
    });
    return data.waWhitelist;
}
