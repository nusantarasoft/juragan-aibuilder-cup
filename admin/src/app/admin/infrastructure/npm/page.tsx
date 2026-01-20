"use client";

import React from 'react';
import { Card, Button, Typography, Alert } from 'antd';
import { SafetyCertificateOutlined, ExportOutlined } from '@ant-design/icons';
import CMSLayout from '@/components/layout/CMSLayout';

export default function NPMPage() {
    const dashboardUrl = "http://127.0.0.1:8081";

    return (
        <CMSLayout title="Nginx Proxy Manager" subTitle="Infrastructure > NPM">
            <div className="flex flex-col gap-6">
                <Alert
                    message="Credentials"
                    description={<span>Default Login: <b>admin@example.com</b> / <b>changeme</b></span>}
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
                        title="Nginx Proxy Manager"
                        sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
                    />
                </Card>
            </div>
        </CMSLayout>
    );
}
