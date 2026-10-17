/** D-40: single owner WhatsApp number per UMKM store (admin forms). */

export function normalizeSingleStoreWaPhone(raw: unknown): string {
    const value = Array.isArray(raw) ? raw[0] : raw;
    const digits = String(value ?? '').replace(/\D/g, '');
    if (digits.length < 8) return '';
    return digits;
}

export function validateSingleStoreWaPhone(raw: unknown): string {
    const phone = normalizeSingleStoreWaPhone(raw);
    if (!phone) {
        throw new Error('Nomor WhatsApp pemilik wajib (628...)');
    }
    return phone;
}
