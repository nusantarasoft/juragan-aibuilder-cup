/**
 * Build a Google Auth client for Vertex AI.
 * Prefer service-account JSON from studio_settings; otherwise fall back to ADC
 * (GOOGLE_APPLICATION_CREDENTIALS / GCE metadata).
 */
export type GoogleServiceAccountCredentials = {
    type?: string;
    project_id?: string;
    private_key?: string;
    client_email?: string;
    [key: string]: unknown;
};

export function parseGoogleServiceAccountJson(
    raw?: string | null,
): GoogleServiceAccountCredentials | null {
    if (!raw?.trim()) return null;
    try {
        const parsed = JSON.parse(raw.trim()) as GoogleServiceAccountCredentials;
        if (!parsed || typeof parsed !== 'object') return null;
        if (typeof parsed.client_email !== 'string' || !parsed.client_email.trim()) return null;
        if (typeof parsed.private_key !== 'string' || !parsed.private_key.trim()) return null;
        const credentials = { ...parsed };
        if (credentials.private_key.includes('\\n')) {
            credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
        }
        return credentials;
    } catch {
        return null;
    }
}

export function assertGoogleServiceAccountJson(raw: string): string {
    const parsed = parseGoogleServiceAccountJson(raw);
    if (!parsed) {
        throw new Error(
            'Vertex service account JSON invalid: must include client_email and private_key',
        );
    }
    return JSON.stringify(parsed);
}

export async function createVertexGoogleAuth(options: {
    serviceAccountJson?: string | null;
    projectId?: string;
}) {
    const { GoogleAuth } = await import('google-auth-library');
    const credentials = parseGoogleServiceAccountJson(options.serviceAccountJson);
    return new GoogleAuth({
        scopes: 'https://www.googleapis.com/auth/cloud-platform',
        ...(credentials ? { credentials } : {}),
        ...(options.projectId ? { projectId: options.projectId } : {}),
    });
}

export async function getVertexAccessToken(options: {
    serviceAccountJson?: string | null;
    projectId?: string;
}): Promise<string | null | undefined> {
    const auth = await createVertexGoogleAuth(options);
    const client = await auth.getClient();
    const accessToken = await client.getAccessToken();
    return accessToken?.token;
}
