/** Non-sensitive labels for kasir WA → AOS task queue (no phone / message body). */

export type KasirWaMirrorKind = 'consult' | 'coach' | 'off';

export const KASIR_WA_TASK_SOURCE = 'kasir_wa';

export function kasirWaTaskTitle(kind: KasirWaMirrorKind): string {
    if (kind === 'coach') return 'WA Kasir · pendamping';
    if (kind === 'off') return 'WA Kasir · consult (nonaktif)';
    return 'WA Kasir · konsultasi';
}

export function kasirWaTaskDescription(input: {
    kind: KasirWaMirrorKind;
    outcome: string;
    questionChars: number;
}): string {
    const kindLabel = input.kind === 'coach' ? 'pendamping' : input.kind === 'off' ? 'consult off' : 'konsultasi';
    return `Permintaan WA ${kindLabel} (isi disembunyikan, ${input.questionChars} karakter). Hasil: ${input.outcome}.`;
}

export function mapConsultOutcome(status: string): 'done' | 'failed' {
    const s = String(status || '').toLowerCase();
    if (s === 'error' || s === 'failed') return 'failed';
    return 'done';
}
