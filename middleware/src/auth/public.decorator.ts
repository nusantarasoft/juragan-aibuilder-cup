import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Skip JWT global guard (sign-in, health, token-gated share links, etc.). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
