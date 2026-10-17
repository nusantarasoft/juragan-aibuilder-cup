/** Post-recruit module deep-links shown on `/admin/recruit` (keep in sync with recruit page). */
export const RECRUIT_POST_SUCCESS_LINKS = {
    kasir: { templateId: "umkm-kasir", href: "/admin/connect-wa", label: "Hubungkan WhatsApp →" },
    serviceDesk: { templateId: "service-desk", href: "/admin/itsm/tickets", label: "Buka antrian tiket →" },
    finance: { templateId: "finance", href: "/admin/accounting/dashboard", label: "Buka akuntansi →" },
    sales: { templateId: "sales", href: "/admin/crm/dashboard", label: "Buka CRM →" },
    devops: { templateId: "devops", href: "/admin/devops/pipelines", label: "Buka pipeline →" },
    security: { templateId: "security", href: "/admin/security/pentest", label: "Buka assessment keamanan →" },
    facilities: { templateId: "facilities", href: "/admin/bms/energy", label: "Buka telemetri BMS →" },
} as const;

export type RecruitPostSuccessLinkKey = keyof typeof RECRUIT_POST_SUCCESS_LINKS;
