'use client';

import React from 'react';
import { Button } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';

/** Reload embed / static dashboard pages (MinIO, Nessie, infra consoles, etc.). */
export function reloadEmbedPage(): void {
    if (typeof window !== 'undefined') window.location.reload();
}

export function embedPageRefreshButton(key = 'r'): React.ReactNode {
    return (
        <Button
            key={key}
            icon={<ReloadOutlined />}
            onClick={reloadEmbedPage}
            title="Refresh page"
        />
    );
}
