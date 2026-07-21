import { defineConfig } from 'vitest/config';

// Dedicated coverage gate for the AI Studio module and its submodules.
// Kept separate from the root config so the auth/users gate is unaffected.
export default defineConfig({
    test: {
        globals: true,
        include: ['src/studio/**/*.spec.ts'],
        coverage: {
            provider: 'v8',
            all: true,
            include: ['src/studio/**/*.ts'],
            exclude: [
                '**/*.spec.ts',
                '**/*.module.ts',
                // GraphQL resolvers: their logic is unit-tested (studio.resolver.unit.spec.ts)
                // but Nest decorator type-factory thunks (`() => Type`) are never invoked at
                // runtime and are not meaningful coverage targets.
                '**/*.resolver.ts',
                // HTTP controllers: their handler logic is unit-tested
                // (studio-upload.controller.spec.ts / studio-whatsapp.controller.spec.ts),
                // but the Nest @Controller decorator emits an untestable branch thunk.
                '**/*.controller.ts',
                // Type-only declarations (no runtime code to exercise).
                'src/studio/studio-umkm-agentic-ask.types.ts',
                // Test-only helpers / harnesses.
                'src/studio/studio-test.helpers.ts',
                'src/studio/studio-umkm-test-harness.ts',
                // Standalone eval CLI runner (executed manually, not a unit target).
                'src/studio/studio-rag-eval.runner.ts',
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
