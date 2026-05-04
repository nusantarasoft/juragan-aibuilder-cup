"use client";

import React from 'react';
import { Card, Button, Typography, Alert } from 'antd';
import { WifiOutlined, ExportOutlined } from '@ant-design/icons';
import CMSLayout from '@/components/layout/CMSLayout';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';

export default function PiholePage() {
    const { themeColor } = usePreferencesStore();
    const dashboardUrl = "http://127.0.0.1:8053/admin";

    return (
        <CMSLayout title={<AuroraText colors={[themeColor, "var(--theme-secondary, #6366f1)", "var(--theme-accent, #a78bfa)"]}>Pi-hole DNS Sinkhole</AuroraText>}
            subTitle={<DecryptedText text="Infrastructure > Pi-hole" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}>
            <div className="flex flex-col gap-6">
                <Alert
                    message="Credentials"
                    description={<span>Password: <b>Nusantarasoft123!</b></span>}
                    type="info"
                    showIcon
                    action={
                        <Button
                            type="primary"
                            icon={<ExportOutlined />}
                            href={dashboardUrl}
                            target="_blank"
                        >
                            Open Dashboard
                        </Button>
                    }
                />

                <Card
                    className="w-full overflow-hidden shadow-lg border-0"
                    bodyStyle={{ padding: 0, height: '80vh' }}
                >
                    <iframe
                        src={dashboardUrl}
                        className="w-full h-full border-0"
                        title="Pi-hole Admin"
                        sandbox="allow-same-origin allow-scripts allow-forms"
                    />
                </Card>
            </div>
        </CMSLayout>
    );
}
