import { redirect } from 'next/navigation';

export default async function AiGatewayRedirectPage({
    searchParams,
}: {
    searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
    const resolved = searchParams ? await searchParams : {};
    const tenant = typeof resolved?.tenant === 'string' ? resolved.tenant : undefined;
    redirect(
        tenant
            ? `/admin/ai-studio/settings?tab=whatsapp&tenant=${encodeURIComponent(tenant)}`
            : '/admin/ai-studio/settings?tab=whatsapp',
    );
}
