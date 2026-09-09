import { defineConfig } from 'vitest/config';

/** Coverage gate: Hermes WhatsApp transport + Studio WhatsApp inbound pipe. */
export default defineConfig({
    test: {
        globals: true,
        include: [
            'src/whatsapp/**/*.spec.ts',
            'src/studio/studio-whatsapp*.spec.ts',
            'src/studio/studio-umkm*.spec.ts',
        ],
        coverage: {
            provider: 'v8',
            all: true,
            reportsDirectory: './coverage-hermes-umkm',
            include: [
                'src/whatsapp/**/*.ts',
                'src/studio/studio-whatsapp.service.ts',
                'src/studio/studio-whatsapp.util.ts',
                'src/studio/studio-whatsapp.controller.ts',
                'src/studio/studio-umkm.service.ts',
                'src/studio/studio-umkm.util.ts',
                'src/studio/studio-umkm.cron.ts',
                'src/studio/studio-umkm-*.ts',
            ],
            exclude: [
                '**/*.spec.ts',
                '**/*.module.ts',
                '**/whatsapp-provider.module.ts',
                '**/*types.ts',
                '**/*harness*',
                '**/*fixture*',
                '**/studio-umkm-test-harness.ts',
                '**/studio-umkm-stale-sale.fixture.ts',
                '**/*.controller.ts',
            ],
            thresholds: {
                // Hermes transport: 100% lines.
                'src/whatsapp/hermes.provider.ts': {
                    statements: 98,
                    branches: 80,
                    functions: 95,
                    lines: 100,
                },
                'src/whatsapp/hermes-webhook.normalizer.ts': {
                    statements: 100,
                    branches: 90,
                    functions: 100,
                    lines: 100,
                },
                // Raise toward 100% as gaps close (currently ~90% lines).
                statements: 88,
                branches: 80,
                functions: 92,
                lines: 90,
            },
        },
    },
});
