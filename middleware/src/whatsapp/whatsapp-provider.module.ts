import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { WahaModule } from '../waha/waha.module';
import { WahaClientService } from '../waha/waha-client.service';
import { HermesProvider } from './hermes.provider';
import { WahaProvider } from './waha.provider';
import { WHATSAPP_TRANSPORT, WhatsAppTransport } from './whatsapp-transport.types';

export function resolveWhatsAppProviderId(raw?: string): 'waha' | 'hermes' {
    const v = (raw || 'waha').trim().toLowerCase();
    return v === 'hermes' ? 'hermes' : 'waha';
}

@Global()
@Module({
    imports: [ConfigModule, WahaModule],
    providers: [
        WahaProvider,
        HermesProvider,
        {
            provide: WHATSAPP_TRANSPORT,
            inject: [ConfigService, WahaProvider, HermesProvider],
            useFactory: (
                config: ConfigService,
                waha: WahaProvider,
                hermes: HermesProvider,
            ): WhatsAppTransport => {
                const id = resolveWhatsAppProviderId(config.get('WHATSAPP_PROVIDER'));
                return id === 'hermes' ? hermes : waha;
            },
        },
    ],
    exports: [WHATSAPP_TRANSPORT, WahaProvider, HermesProvider, WahaModule],
})
export class WhatsAppProviderModule {}

/** Test helper — build transport without Nest DI. */
export function createWhatsAppTransportForTests(
    provider: 'waha' | 'hermes',
    deps: { wahaClient?: WahaClientService; config?: ConfigService },
): WhatsAppTransport {
    if (provider === 'hermes') {
        return new HermesProvider(deps.config || ({ get: () => undefined } as any));
    }
    if (!deps.wahaClient) {
        throw new Error('wahaClient required');
    }
    return new WahaProvider(deps.wahaClient);
}
