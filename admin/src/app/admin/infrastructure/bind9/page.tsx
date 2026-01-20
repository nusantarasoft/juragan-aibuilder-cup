"use client";

import React from 'react';
import { Card, Button, Typography, Alert } from 'antd';
import { GlobalOutlined, ExportOutlined } from '@ant-design/icons';
import CMSLayout from '@/components/layout/CMSLayout';

export default function Bind9Page() {
    const dashboardUrl = "http://127.0.0.1:10000";

    return (
        <CMSLayout title="BIND9 DNS Manager" subTitle="Infrastructure > BIND9">
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
