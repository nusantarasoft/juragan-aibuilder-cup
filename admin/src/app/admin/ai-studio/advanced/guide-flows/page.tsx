"use client";

import React, { useCallback, useEffect, useState } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import { useAppMessage } from "@/hooks/useAppMessage";
import { studioService, type StudioNotebook } from "@/lib/studioService";
import { Empty, Select, Spin } from "antd";
import GuideFlowsPanel from "../../GuideFlowsPanel";
import { useAuthStore } from "@/store/useAuthStore";
import { useAuth } from "@/context/AuthContext";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { AuroraText } from "@/components/magicui/aurora-text";
import { summarizeSources } from "../../studioSourceStatus";

export default function StudioGuideFlowsPage() {
    const message = useAppMessage();
    const { themeColor } = usePreferencesStore();
    const { user: contextUser, loading: authLoading } = useAuth();
    const authUser = useAuthStore((s) => s.user);
    const userId = authUser?.id ?? contextUser?.id;

    const [notebooks, setNotebooks] = useState<StudioNotebook[]>([]);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [sourcesReady, setSourcesReady] = useState(false);
    const [loading, setLoading] = useState(true);

    const loadNotebooks = useCallback(async () => {
        if (!userId) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const list = await studioService.getNotebooks(userId);
            setNotebooks(list);
            if (list.length && !activeId) setActiveId(list[0].id);
        } catch {
            message.error("Gagal memuat notebooks");
        } finally {
            setLoading(false);
        }
    }, [userId, activeId, message]);

    useEffect(() => {
        if (!authLoading) void loadNotebooks();
    }, [authLoading, loadNotebooks]);

    useEffect(() => {
        if (!activeId) return;
        studioService
            .getSourceStatus(activeId)
            .then((sources) => setSourcesReady(summarizeSources(sources).anyIndexed))
            .catch(() => setSourcesReady(false));
    }, [activeId]);

    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, "#6366f1", "#a78bfa"]}>Guide Flows</AuroraText>}
            subTitle="Advanced — alur percakapan terstruktur per notebook"
        >
            {loading || authLoading ? (
                <div className="flex justify-center py-16"><Spin /></div>
            ) : !userId || notebooks.length === 0 ? (
                <Empty description="Buat notebook di Studio terlebih dahulu" />
            ) : (
                <div className="flex flex-col gap-4 h-full" style={{ minHeight: 500 }}>
                    <Select
                        className="max-w-md"
                        value={activeId ?? undefined}
                        onChange={setActiveId}
                        options={notebooks.map((nb) => ({ value: nb.id, label: nb.name }))}
                    />
                    <GuideFlowsPanel
                        notebookId={activeId}
                        themeColor={themeColor}
                        userId={userId}
                        sourcesReady={sourcesReady}
                    />
                </div>
            )}
        </CMSLayout>
    );
}
