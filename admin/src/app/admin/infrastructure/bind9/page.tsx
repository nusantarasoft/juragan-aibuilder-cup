"use client";

import React from 'react';
import { Card, Button, Typography, Alert } from 'antd';
import { GlobalOutlined, ExportOutlined } from '@ant-design/icons';
import CMSLayout from '@/components/layout/CMSLayout';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';

export default function Bind9Page() {
    const { themeColor } = usePreferencesStore();
    const dashboardUrl = "http://127.0.0.1:10000";

    return (
        <CMSLayout title={<AuroraText colors={[themeColor, "var(--theme-secondary, #6366f1)", "var(--theme-accent, #a78bfa)"]}>BIND9 DNS Manager</AuroraText>}
            subTitle={<DecryptedText text="Infrastructure > BIND9" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}>
            <div className="flex flex-col gap-6">
                <Alert
                    message="Webmin Credentials"
                    description={<span>User: <b>root</b> / Password: <b>Nusantarasoft123!</b></span>}
                    type="info"
                    showIcon
                    action={
                        <Button
                            type="primary"
                            icon={<ExportOutlined />}
                            href={dashboardUrl}
                            target="_blank"
                        >
                            Open Webmin
                        </Button>
                    }
                />

                <Alert
                    message="SSL Warning"
                    description="Webmin uses self-signed SSL. If the iframe below is blank, try opening it in a new tab first and accepting the certificate."
                    type="warning"
                    showIcon
                />

                <Card
                    className="w-full overflow-hidden shadow-lg border-0"
                    bodyStyle={{ padding: 0, height: '80vh' }}
                >
                    <iframe
                        src={dashboardUrl}
                        className="w-full h-full border-0"
                        title="BIND9 Webmin"
                        sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
                    />
                </Card>
            </div>
        </CMSLayout>
    );
}
