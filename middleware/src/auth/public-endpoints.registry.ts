/**
 * Explicit allowlist of GraphQL operations and REST routes marked @Public() or @AlternativeAuth().
 * The access-control-metadata unit test fails if code metadata diverges from this registry.
 */
export const PUBLIC_GRAPHQL_OPERATIONS = [
    'signIn',
    'signUp',
    'refreshToken',
    'me',
    'health',
    'version',
    'registerTenant',
    'onboardingCaptchaConfig',
    'onboardingCaptchaDevToken',
] as const;

export const ALTERNATIVE_AUTH_GRAPHQL_OPERATIONS = [] as const;

export const PUBLIC_HTTP_ROUTES = [
    'GET /webhooks/health',
    'GET /ml/health',
    'GET /studio/shared/:token',
] as const;

export const ALTERNATIVE_AUTH_HTTP_ROUTES = [
    'POST /internal/kasir-consult',
    'POST /internal/wa-turn',
    'GET /internal/wa-handoff',
    'POST /webhooks/labelstudio',
    'POST /api/studio/whatsapp/webhook',
    'POST /ml/setup',
    'POST /ml/predict',
] as const;
