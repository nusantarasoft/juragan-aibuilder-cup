import { SetMetadata } from '@nestjs/common';

export const IS_ALTERNATIVE_AUTH_KEY = 'isAlternativeAuth';

/**
 * Skip JWT global guard; handler enforces its own auth (HMAC, shared secret, etc.).
 * Must stay on the audit allowlist test.
 */
export const AlternativeAuth = () => SetMetadata(IS_ALTERNATIVE_AUTH_KEY, true);
