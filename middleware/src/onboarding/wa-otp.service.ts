import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    Logger,
    OnModuleInit,
    ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomInt } from 'crypto';
import { checkOnboardingRateLimit, resetOnboardingRateLimitsForTests } from './onboarding-rate-limit';
import {
    assertWaOtpProductionBootConfig,
    DEV_WA_OTP_SECRET,
    isProductionNode,
    isWaOtpSecretConfigured,
} from './onboarding-env';
import { WaOtpOutboundService } from './wa-otp-outbound.service';

type PendingOtp = {
    codeHash: string;
    expiresAt: number;
    attempts: number;
};

const pending = new Map<string, PendingOtp>();

export type WaOtpRequestResult = {
    delivery: 'mock' | 'wa';
    sent: boolean;
    /** QA/dev only — never set in production. */
    mockCode?: string;
};

export function resetWaOtpForTests(): void {
    pending.clear();
    resetOnboardingRateLimitsForTests();
}

function isTruthyFlag(raw: string | undefined): boolean {
    const v = (raw ?? '').toString().trim().toLowerCase();
    return v === '1' || v === 'true' || v === 'yes' || v === 'on';
}

@Injectable()
export class WaOtpService implements OnModuleInit {
    private readonly logger = new Logger(WaOtpService.name);

    constructor(
        private readonly config: ConfigService,
        private readonly outbound: WaOtpOutboundService,
    ) {}

    onModuleInit(): void {
        assertWaOtpProductionBootConfig(this.config);
        if (isProductionNode(this.config) && !isWaOtpSecretConfigured(this.config)) {
            this.logger.warn(
                'F2-3 WA owner OTP is NOT configured (missing WA_OTP_SECRET). ' +
                    'Middleware will start, but requestOwnerWaOtp / verifyOwnerWaOtp will reject until WA_OTP_SECRET is set.',
            );
        }
    }

    private assertWaOtpAvailable(): void {
        if (isProductionNode(this.config) && !isWaOtpSecretConfigured(this.config)) {
            throw new ServiceUnavailableException('WA OTP is not configured');
        }
    }

    isMockMode(): boolean {
        if (isProductionNode(this.config)) return false;
        return isTruthyFlag(
            (this.config.get('WA_OTP_MOCK') ?? process.env.WA_OTP_MOCK) as string | undefined,
        );
    }

    private otpSecret(): string {
        const secret = (this.config.get('WA_OTP_SECRET') ?? process.env.WA_OTP_SECRET ?? '')
            .toString()
            .trim();
        if (isProductionNode(this.config)) {
            return secret;
        }
        return secret || DEV_WA_OTP_SECRET;
    }

    assertRateLimit(storeId: string, phone: string, clientIp: string): void {
        const windowMs = 15 * 60_000;
        const keys = [
            `wa-otp:store:${storeId}`,
            `wa-otp:phone:${phone}`,
            `wa-otp:ip:${clientIp || 'unknown'}`,
        ];
        for (const key of keys) {
            if (!checkOnboardingRateLimit(key, 5, windowMs)) {
                throw new ForbiddenException('Terlalu banyak permintaan OTP — coba lagi nanti.');
            }
        }
    }

    assertVerifyRateLimit(storeId: string, phone: string): void {
        const key = `wa-otp-verify:${storeId}:${phone}`;
        if (!checkOnboardingRateLimit(key, 8, 15 * 60_000)) {
            throw new ForbiddenException('Terlalu banyak percobaan OTP — coba lagi nanti.');
        }
    }

    private hashCode(code: string): string {
        const pepper = this.otpSecret();
        return createHash('sha256').update(`${pepper}:${code}`).digest('hex');
    }

    /** Issue OTP; in production sends via shared NS WA (Hermes) to owner phone only. */
    async requestOtp(storeId: string, phone: string, clientIp: string): Promise<WaOtpRequestResult> {
        this.assertWaOtpAvailable();
        this.assertRateLimit(storeId, phone, clientIp);
        const code = String(randomInt(100000, 999999));
        const key = `${storeId}:${phone}`;
        pending.set(key, {
            codeHash: this.hashCode(code),
            expiresAt: Date.now() + 10 * 60_000,
            attempts: 0,
        });

        if (this.isMockMode()) {
            this.logger.debug(`WA OTP mock for store=${storeId} phone=${phone.slice(0, 4)}***`);
            return { mockCode: code, delivery: 'mock', sent: true };
        }

        const send = await this.outbound.sendOwnerOtp(phone, code);
        if (!send.success) {
            pending.delete(key);
            throw new ServiceUnavailableException(
                'Gagal mengirim OTP ke WhatsApp — coba lagi atau hubungi support.',
            );
        }
        return { delivery: 'wa', sent: true };
    }

    verifyOtp(storeId: string, phone: string, codeRaw: string): void {
        this.assertWaOtpAvailable();
        this.assertVerifyRateLimit(storeId, phone);
        const code = codeRaw.trim();
        if (!/^\d{6}$/.test(code)) {
            throw new BadRequestException('Kode OTP harus 6 digit');
        }
        const key = `${storeId}:${phone}`;
        const row = pending.get(key);
        if (!row || row.expiresAt <= Date.now()) {
            throw new BadRequestException('OTP kedaluwarsa — minta kode baru');
        }
        row.attempts += 1;
        if (row.attempts > 6) {
            pending.delete(key);
            throw new ForbiddenException('OTP dibatalkan — minta kode baru');
        }
        if (row.codeHash !== this.hashCode(code)) {
            throw new BadRequestException('Kode OTP salah');
        }
        pending.delete(key);
    }
}
