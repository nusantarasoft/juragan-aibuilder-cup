"use client";
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function OldRolesPage() {
    const { themeColor } = usePreferencesStore();
    const router = useRouter();
    useEffect(() => {
        router.replace("/admin/permissions/profiles");
    }, [router]);
    return null;
}
