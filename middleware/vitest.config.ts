import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        include: ['src/**/*.spec.ts'],
        coverage: {
            provider: 'v8',
            // Resolvers are exercised by unit + gated integration tests; Nest GraphQL
            // decorator type factories are not meaningful coverage targets.
            include: [
                'src/auth/app-roles.ts',
                'src/auth/auth.service.ts',
                'src/auth/gql-auth.guard.ts',
                'src/auth/roles.guard.ts',
                'src/users/users.service.ts',
            ],
            exclude: [
                '**/*.spec.ts',
                '**/*.module.ts',
                '**/auth-test.helpers.ts',
                '**/roles.decorator.ts',
                '**/*.resolver.ts',
            ],
            thresholds: {
                statements: 100,
                branches: 100,
                functions: 100,
                lines: 100,
            },
        },
    },
});
