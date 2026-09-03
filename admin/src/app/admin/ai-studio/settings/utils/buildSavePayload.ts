import type { LlmProvider, StudioSettingsFormValues } from "../types";

/** DB columns only — prevents save failures from UI-only fields. */
const DB_FIELDS = [
    "default_llm_provider",
    "default_embedding_provider",
    "anthropic_api_key",
    "anthropic_model",
    "anthropic_max_tokens",
    "google_api_key",
    "google_service_account_json",
    "google_project_id",
    "google_location",
    "google_model",
    "google_embedding_model",
    "openai_api_key",
    "openai_model",
    "openai_embedding_model",
    "groq_api_key",
    "groq_model",
    "ollama_base_url",
    "ollama_model",
    "ollama_embedding_model",
] as const;

export function buildSavePayload(values: StudioSettingsFormValues): Record<string, unknown> {
    const payload: Record<string, unknown> = {};

    for (const key of DB_FIELDS) {
        if (values[key as keyof StudioSettingsFormValues] !== undefined) {
            payload[key] = values[key as keyof StudioSettingsFormValues];
        }
    }

    if (values.clear_anthropic_api_key) payload.clear_anthropic_api_key = true;
    if (values.clear_google_api_key) payload.clear_google_api_key = true;
    if (values.clear_google_service_account_json) payload.clear_google_service_account_json = true;
    if (values.clear_openai_api_key) payload.clear_openai_api_key = true;
    if (values.clear_groq_api_key) payload.clear_groq_api_key = true;

    return payload;
}

export function validateActiveProvider(
    provider: LlmProvider,
    values: StudioSettingsFormValues,
): string | null {
    switch (provider) {
        case "ollama":
            if (!values.ollama_base_url?.trim()) return "Ollama endpoint wajib diisi.";
            if (!values.ollama_model?.trim()) return "Ollama model wajib diisi.";
            return null;
        case "anthropic":
            if (!values.anthropic_api_key_configured && !values.anthropic_api_key?.trim()) {
                return "Anthropic API key wajib untuk provider aktif.";
            }
            if (!values.anthropic_model?.trim()) return "Anthropic model wajib diisi.";
            return null;
        case "openai":
            if (!values.openai_api_key_configured && !values.openai_api_key?.trim()) {
                return "OpenAI API key wajib untuk provider aktif.";
            }
            if (!values.openai_model?.trim()) return "OpenAI model wajib diisi.";
            return null;
        case "groq":
            if (!values.groq_api_key_configured && !values.groq_api_key?.trim()) {
                return "Groq API key wajib untuk provider aktif.";
            }
            if (!values.groq_model?.trim()) return "Groq model wajib diisi.";
            return null;
        case "google":
            if (
                !values.google_api_key_configured &&
                !values.google_api_key?.trim() &&
                !values.google_project_id?.trim() &&
                !values.google_service_account_configured &&
                !values.google_service_account_json?.trim()
            ) {
                return "Google API key, Vertex Project ID, atau Service Account JSON wajib untuk provider aktif.";
            }
            if (!values.google_model?.trim()) return "Google model wajib diisi.";
            return null;
        default:
            return null;
    }
}
