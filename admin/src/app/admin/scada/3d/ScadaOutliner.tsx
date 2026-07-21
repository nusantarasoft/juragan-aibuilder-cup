"use client";

import React, { useState } from "react";
import { useScada3dStore } from "@/store/useScada3dStore";
import { Tree, Input, Typography, theme, Button, Tooltip, Space } from "antd";
import { SearchOutlined, EyeOutlined, EyeInvisibleOutlined, DeleteOutlined, AimOutlined, BoxPlotOutlined, AppstoreOutlined } from "@ant-design/icons";
import { usePreferencesStore } from "@/store/usePreferencesStore";

const { Text } = Typography;

export default function ScadaOutliner({ selectedId, onSelect }: { selectedId: string | null, onSelect: (id: string | null) => void }) {
    const { elements, deleteElement } = useScada3dStore();
    const { token } = theme.useToken();
    const { themeColor } = usePreferencesStore();
    const [search, setSearch] = useState("");

    const isDark = token.colorBgContainer === '#141414' || token.colorBgBase?.includes('14');

    // Group elements by type for tree
    const categories = {
        'landscape': ['tree', 'bush', 'road', 'water', 'grass'],
        'vehicles': ['truck', 'forklift'],
        'building': ['wall', 'floor', 'column', 'door', 'stairs', 'window', 'roof'],
        'datacenter': ['server_rack', 'cable_tray', 'crac', 'fire_suppression', 'access_floor'],
        'electrical': ['transformer', 'generator', 'ups', 'ats', 'pdu', 'switchgear', 'mcc', 'panel'],
        'hvac': ['chiller', 'pump', 'cooling_tower', 'valve', 'ahu', 'fcu', 'damper', 'exhaust_fan', 'duct'],
        'piping': ['pipe', 'elbow', 'tee', 'reducer', 'flange'],
        'primitives': ['box', 'sphere', 'cylinder', 'cone', 'torus', 'plane'],
        'other': ['robot']
    };

    const getCategory = (type: string) => {
        for (const [cat, types] of Object.entries(categories)) {
            if (types.includes(type)) return cat;
        }
        return 'other';
    };

    const treeData = Object.keys(categories).map(catKey => {
        const catElements = elements.filter(el => getCategory(el.type) === catKey);
        if (catElements.length === 0) return null;

        const filteredCatElements = search ? catElements.filter(el => 
            el.id.toLowerCase().includes(search.toLowerCase()) || 
            (el.properties.name && el.properties.name.toLowerCase().includes(search.toLowerCase()))
        ) : catElements;

        if (filteredCatElements.length === 0) return null;

        return {
            title: <Text strong style={{ fontSize: 12, textTransform: 'capitalize' }}>{catKey.replace('_', ' ')}</Text>,
            key: `cat-${catKey}`,
            selectable: false,
            children: filteredCatElements.map(el => {
                const isSelected = el.id === selectedId;
                return {
                    title: (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                            <Space size={4} style={{ maxWidth: '80%', overflow: 'hidden' }}>
                                <BoxPlotOutlined style={{ color: isSelected ? themeColor : token.colorTextSecondary }} />
                                <Text style={{ fontSize: 11, color: isSelected ? themeColor : undefined }} ellipsis>
                                    {el.properties.name || el.id}
                                </Text>
                            </Space>
                            <Space size={0} className="outliner-actions" style={{ opacity: isSelected ? 1 : 0 }}>
                                <Tooltip title="Delete">
                                    <Button 
                                        type="text" 
                                        size="small" 
                                        danger 
                                        icon={<DeleteOutlined />} 
                                        onClick={(e) => { e.stopPropagation(); deleteElement(el.id); if (selectedId === el.id) onSelect(null); }} 
                                        style={{ height: 20, width: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    />
                                </Tooltip>
                            </Space>
                        </div>
                    ),
                    key: el.id,
                    isLeaf: true,
                };
            })
        };
    }).filter(Boolean);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            <div style={{ padding: '8px 12px 0' }}>
                <Input 
                    placeholder="Search scene..." 
                    prefix={<SearchOutlined />} 
                    size="small"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    allowClear
                    style={{ background: isDark ? 'rgba(255,255,255,0.04)' : undefined, border: 'none' }}
                />
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 4px' }}>
                <style>{`
                    .ant-tree .ant-tree-node-content-wrapper {
                        width: 100%;
                    }
                    .ant-tree .ant-tree-node-content-wrapper:hover .outliner-actions {
                        opacity: 1 !important;
                    }
                `}</style>
                {treeData.length > 0 ? (
                    <Tree
                        // @ts-ignore
                        treeData={treeData}
                        selectedKeys={selectedId ? [selectedId] : []}
                        onSelect={(keys) => {
                            if (keys.length > 0 && !String(keys[0]).startsWith('cat-')) {
                                onSelect(keys[0] as string);
                            }
                        }}
                        defaultExpandAll
                        blockNode
                        style={{ background: 'transparent' }}
                    />
                ) : (
                    <div style={{ padding: 16, textAlign: 'center' }}>
                        <Text type="secondary" style={{ fontSize: 11 }}>No objects found.</Text>
                    </div>
                )}
            </div>
        </div>
    );
}
