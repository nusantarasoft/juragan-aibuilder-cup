/** Post-recruit module deep-links shown on `/admin/recruit` (keep in sync with recruit page). */
export const RECRUIT_POST_SUCCESS_LINKS = {
    kasir: { templateId: "umkm-kasir", href: "/admin/connect-wa", label: "Hubungkan WhatsApp →" },
    serviceDesk: { templateId: "service-desk", href: "/admin/virtual-office", label: "Buka Virtual Office →" },
    finance: { templateId: "finance", href: "/admin/virtual-office", label: "Buka Virtual Office →" },
    sales: { templateId: "sales", href: "/admin/virtual-office", label: "Buka Virtual Office →" },
    devops: { templateId: "devops", href: "/admin/agentic-os", label: "Buka Agentic OS →" },
    security: { templateId: "security", href: "/admin/agentic-os", label: "Buka Agentic OS →" },
    facilities: { templateId: "facilities", href: "/admin/virtual-office", label: "Buka Virtual Office →" },
} as const;

export type RecruitPostSuccessLinkKey = keyof typeof RECRUIT_POST_SUCCESS_LINKS;
