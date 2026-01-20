"use client";

import React from 'react';
import { Card, Button, Typography, Alert } from 'antd';
import { GatewayOutlined, ExportOutlined } from '@ant-design/icons';
import CMSLayout from '@/components/layout/CMSLayout';

const { Title, Paragraph } = Typography;

export default function TraefikPage() {
    const dashboardUrl = "http://127.0.0.1:8080/dashboard/";

    return (
        <CMSLayout title="Traefik Proxy Monitor" subTitle="Infrastructure > Traefik">
            <div className="flex flex-col gap-6">
                <Alert
                    message="Access Note"
                    description="If the dashboard doesn't load below, it might be blocked by browser security settings or the service is not running. Click the button below to open it directly."
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
                        title="Traefik Dashboard"
                        sandbox="allow-same-origin allow-scripts allow-forms"
                    />
                </Card>
            </div>
        </CMSLayout>
    );
}
