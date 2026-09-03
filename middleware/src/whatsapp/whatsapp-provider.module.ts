import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HermesProvider } from './hermes.provider';
import { WHATSAPP_TRANSPORT, WhatsAppTransport } from './whatsapp-transport.types';

/** Sole production WhatsApp transport is Hermes. */
export function resolveWhatsAppProviderId(_raw?: string): 'hermes' {
    return 'hermes';
}

@Global()
@Module({
    imports: [ConfigModule],
    providers: [
        HermesProvider,
        {
            provide: WHATSAPP_TRANSPORT,
            inject: [ConfigService, HermesProvider],
            useFactory: (_config: ConfigService, hermes: HermesProvider): WhatsAppTransport => hermes,
        },
    ],
    exports: [WHATSAPP_TRANSPORT, HermesProvider],
})
export class WhatsAppProviderModule {}

/** Test helper — build transport without Nest DI. */
export function createWhatsAppTransportForTests(
    _provider: 'hermes' | string,
    deps: { config?: ConfigService },
): WhatsAppTransport {
    return new HermesProvider(deps.config || ({ get: () => undefined } as any));
}
