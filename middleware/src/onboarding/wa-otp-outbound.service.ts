import { Injectable, Logger } from '@nestjs/common';
import { HermesProvider } from '../whatsapp/hermes.provider';
import { normalizePhoneDigits } from '../studio/studio-whatsapp.util';

/** Platform OTP to owner phone only — bypasses tenant outbound gate (pre-connect). */
@Injectable()
export class WaOtpOutboundService {
    private readonly logger = new Logger(WaOtpOutboundService.name);

    constructor(private readonly hermes: HermesProvider) {}

    async sendOwnerOtp(phoneRaw: string, code: string): Promise<{ success: boolean; error?: string }> {
        const phone = normalizePhoneDigits(phoneRaw);
        const text =
            `Kode verifikasi NS3 (owner): ${code}\n` +
            'Berlaku 10 menit. Jangan bagikan ke siapapun.';
        const chatId = this.hermes.phoneToChatId(phone);
        const res = await this.hermes.sendText(chatId, text);
        if (!res.success) {
            this.logger.warn(`Owner OTP WA send failed phone=${phone.slice(0, 4)}*** err=${res.error}`);
        }
        return { success: Boolean(res.success), error: res.error };
    }
}
