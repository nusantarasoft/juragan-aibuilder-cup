"use client";

import React from 'react';
import CMSLayout from '@/components/layout/CMSLayout';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import SourceManager from '../SourceManager';

export default function DataSourcesPage() {
    const { themeColor } = usePreferencesStore();

    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, 'var(--theme-secondary, #6366f1)', 'var(--theme-accent, #a78bfa)']}>Data Sources</AuroraText>}
            subTitle={
                <DecryptedText
                    text="Manage your Dremio data source connections"
                    animateOn="view"
                    revealDirection="center"
                    speed={50}
                    maxIterations={15}
                    sequential={true}
                />
            }
        >
            <SourceManager />
        </CMSLayout>
    );
}
