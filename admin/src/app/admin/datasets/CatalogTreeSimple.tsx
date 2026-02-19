"use client";

import React from 'react';
import { Tree, Card } from 'antd';

interface CatalogTreeProps {
    onSelect: (path: string[], type: string, id: string) => void;
}

export default function CatalogTreeSimple({ onSelect }: CatalogTreeProps) {
    return (
        <Card title="Catalog">
            <p>Simple Catalog Tree</p>
        </Card>
    );
}
