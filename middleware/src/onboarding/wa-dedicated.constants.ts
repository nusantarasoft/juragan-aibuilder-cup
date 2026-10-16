/** Default shared NS Hermes session (see KASIR_PIPE_SESSION). */
export const WA_SHARED_SESSION_NAME = 'hermes';

export const WA_INBOX_SHARED = 'shared' as const;
export const WA_INBOX_DEDICATED = 'dedicated' as const;
export type WaInboxMode = typeof WA_INBOX_SHARED | typeof WA_INBOX_DEDICATED;

/** Max Hermes session label length (Baileys dir name). */
export const WA_DEDICATED_SESSION_MAX_LEN = 48;
