"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Tree, Input, Button, Card, Space, ConfigProvider, theme, message, Tag } from 'antd';
import type { TreeProps } from 'antd';
import {
    FolderAddOutlined,
    TableOutlined,
    FolderOutlined,
    SearchOutlined,
    ReloadOutlined,
    PlusOutlined,
    ExpandAltOutlined,
    CompressOutlined,
    CaretRightOutlined,
    CaretDownOutlined,
    CloudServerOutlined
} from '@ant-design/icons';
import { dremioService, CatalogItem, DremioSource } from '@/lib/dremioService';
import { getTypeIcon } from './utils';
import { TooltipWrapper as AnimatedTooltip } from '@/components/mvpblocks/AnimatedTooltip';

interface CatalogTreeProps {
    onSelect: (path: string[], type: string, id: string) => void;
    onCreateSpace?: () => void;
    onCreateVDS?: () => void;
    onAddSource?: () => void;
    refreshTrigger?: number;
    className?: string;
    style?: React.CSSProperties;
}

export default function CatalogTree({ onSelect, onCreateSpace, onCreateVDS, onAddSource, refreshTrigger = 0, className, style }: CatalogTreeProps) {
    const [treeGroups, setTreeGroups] = useState<{
        spaces: any[];
        lakehouse: any[];
        storage: any[];
        databases: any[];
    }>({ spaces: [], lakehouse: [], storage: [], databases: [] });

    const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
    const [selectedKeys, setSelectedKeys] = useState<React.Key[]>([]);
    const [searchValue, setSearchValue] = useState('');
    const [loading, setLoading] = useState(false);
    const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
    const { token } = theme.useToken();

    useEffect(() => {
        loadData();
    }, [refreshTrigger]);

    const loadData = async () => {
        try {
            setLoading(true);
            const [catalog, sourcesDetail] = await Promise.all([
                dremioService.getCatalog(),
                dremioService.getSources()
            ]);

            const groups: typeof treeGroups = {
                spaces: [],
                lakehouse: [],
                storage: [],
                databases: []
            };

            // Process Spaces and Home from Catalog
            catalog.forEach(item => {
                const name = item.path[item.path.length - 1];
                const type = item.containerType || item.type;

                const node: any = {
                    title: name,
                    key: item.id,
                    isLeaf: false,
                    icon: getTypeIcon(type),
                    data: item
                };

                if (type === 'SPACE' || type === 'HOME') {
                    groups.spaces.push(node);
                }
            });

            // Process Sources directly from Sources API to ensure visibility
            sourcesDetail.forEach(source => {
                const sourceType = (source.type || 'UNKNOWN').toUpperCase();
                const node: any = {
                    title: source.name,
                    key: source.id,
                    isLeaf: false, // Sources always have children
                    icon: getTypeIcon('SOURCE', sourceType),
                    data: {
                        id: source.id,
                        path: [source.name],
                        type: 'SOURCE',
                        containerType: sourceType,
                        tag: source.tag,
                        sourceType: sourceType
                    }
                };

                // Add explicit checks for common source types
                if (['NESSIE', 'ICEBERG', 'DELTA'].includes(sourceType)) {
                    groups.lakehouse.push(node);
                } else if (['S3', 'AWS', 'AWS S3', 'MINIO', 'AZURE_STORAGE', 'AZURE', 'GCS', 'ADLS', 'HDFS', 'NAS', 'FILESYSTEM'].includes(sourceType)) {
                    groups.storage.push(node);
                } else {
                    groups.databases.push(node);
                }
            });

            setTreeGroups(groups);
        } catch (error) {
            console.error("Failed to load catalog tree:", error);
            message.error("Failed to load catalog");
        } finally {
            setLoading(false);
        }
    };

    const onLoadData = ({ key, children, data }: any) => {
        return new Promise<void>(async (resolve) => {
            if (children && children.length > 0) {
                resolve();
                return;
            }
            try {
                const item = data as CatalogItem;
                // For sources, we might need to use getCatalogChildren or getCatalogByPath
                // Dremio API usually works with path for children
                const detail = await dremioService.getCatalogByPath(item.path);
                const childrenItems = detail.children || [];

                const mapNodes = (list: any[]): any[] => {
                    return list.map(node => {
                        if (node.key === key) {
                            return {
                                ...node,
                                children: childrenItems.map(child => ({
                                    title: child.path[child.path.length - 1],
                                    key: child.id,
                                    isLeaf: ['DATASET', 'PHYSICAL_DATASET', 'VIRTUAL_DATASET', 'DATASET_TABLE', 'DATASET_VIRTUAL'].includes(child.type),
                                    icon: getTypeIcon(child.type),
                                    data: child
                                }))
                            };
                        }
                        if (node.children) return { ...node, children: mapNodes(node.children) };
                        return node;
                    });
                };

                setTreeGroups(prev => ({
                    spaces: mapNodes(prev.spaces),
                    lakehouse: mapNodes(prev.lakehouse),
                    storage: mapNodes(prev.storage),
                    databases: mapNodes(prev.databases)
                }));
            } catch (error) {
                console.error("Failed to load children:", error);
            }
            resolve();
        });
    };

    const onTreeSelect: TreeProps['onSelect'] = (keys, info: any) => {
        setSelectedKeys(keys);
        if (keys.length > 0) {
            const item = info.node.data as CatalogItem;
            onSelect(item.path, item.type, item.id);
        }
    };

    // Filter logic for grouped trees
    const filteredGroups = useMemo(() => {
        if (!searchValue) return treeGroups;
        const lowerSearch = searchValue.toLowerCase();

        const filterNodes = (nodes: any[]): any[] => {
            return nodes.map(node => {
                const match = (node.title as string).toLowerCase().includes(lowerSearch);
                const children = node.children ? filterNodes(node.children) : [];
                if (match || children.length > 0) return { ...node, children };
                return null;
            }).filter(Boolean) as any[];
        };

        return {
            spaces: filterNodes(treeGroups.spaces),
            lakehouse: filterNodes(treeGroups.lakehouse),
            storage: filterNodes(treeGroups.storage),
            databases: filterNodes(treeGroups.databases)
        };
    }, [treeGroups, searchValue]);

    const titleRender = (node: any) => {
        const isSelected = selectedKeys.includes(node.key);
        const item = node.data;
        // Check for NESSIE either in sourceType (from our mapping) or from item.containerType if available
        const isNessie = (item.sourceType === 'NESSIE' || item.containerType === 'NESSIE');
        const subtext = isNessie ? 'main' : undefined;

        // Count for folders/sources
        const count = node.children?.length || (item as any).children?.length || 0;

        return (
            <div className="flex items-center w-full pr-2 h-full py-1 group/item" style={{ gap: 8 }}>
                <span className="shrink-0 flex items-center">
                    {node.icon}
                </span>

                <span className={`truncate text-[13px] ${isSelected ? 'font-semibold text-white' : 'text-gray-700 dark:text-gray-200'}`}>
                    {node.title}
                </span>

                {subtext && (
                    <Tag bordered={false} className="ml-1 px-1 py-0 text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-400 rounded flex items-center gap-1">
                        <ReloadOutlined style={{ fontSize: 8 }} />
                        {subtext}
                    </Tag>
                )}

                <span className={`ml-auto text-[10px] transition-opacity ${isSelected ? 'text-white/70' : 'text-gray-400 opacity-60 group-hover/item:opacity-100'}`}>
                    {count > 0 ? count : ''}
                </span>
            </div>
        );
    };

    const toggleSection = (key: string) => {
        setCollapsedSections(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const renderHeader = (title: string, count: number, sectionKey: string, onAdd?: () => void) => (
        <div
            className="flex items-center w-full py-2 group/header select-none px-2 mb-1 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 rounded-sm transition-colors"
            onClick={() => toggleSection(sectionKey)}
        >
            <span className="mr-1.5 text-[10px] text-[#8b929e] transition-transform" style={{ transform: collapsedSections[sectionKey] ? 'rotate(0deg)' : 'rotate(90deg)' }}>
                <CaretRightOutlined />
            </span>
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#8b929e]">
                {title} ({count})
            </span>
            {onAdd && (
                <PlusOutlined
                    onClick={(e) => { e.stopPropagation(); onAdd(); }}
                    className="ml-auto text-[12px] text-gray-400 hover:text-violet-500 opacity-0 group-hover/header:opacity-100 transition-opacity p-1 cursor-pointer"
                />
            )}
        </div>
    );

    const handleExpandAll = () => {
        setCollapsedSections({});
    };

    const handleCollapseAll = () => {
        setCollapsedSections({
            spaces: true,
            sources: true,
            lakehouse: true,
            storage: true,
            databases: true
        });
    };

    const treeProps: Partial<TreeProps> = {
        showLine: false,
        showIcon: false,
        switcherIcon: () => <span style={{ width: 0 }} />,
        loadData: onLoadData,
        onExpand: (keys) => {
            setExpandedKeys(keys);
        },
        expandedKeys: expandedKeys,
        autoExpandParent: true,
        onSelect: onTreeSelect,
        selectedKeys: selectedKeys,
        titleRender: titleRender,
        blockNode: true,
        className: "custom-dremio-tree"
    };

    return (
        <Card
            size="small"
            title={
                <div className="flex items-center gap-2">
                    <span style={{
                        background: 'linear-gradient(to right, #8b5cf6, #6366f1)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        fontWeight: 600,
                        fontSize: '14px'
                    }}>
                        Explorer
                    </span>
                </div>
            }
            extra={
                <div className="flex items-center gap-1">
                    <AnimatedTooltip content="Expand All">
                        <Button
                            type="text"
                            icon={<ExpandAltOutlined style={{ fontSize: 14 }} />}
                            onClick={handleExpandAll}
                            size="small"
                            className="text-gray-400 hover:text-violet-500 flex items-center justify-center w-7 h-7"
                        />
                    </AnimatedTooltip>
                    <AnimatedTooltip content="Collapse All">
                        <Button
                            type="text"
                            icon={<CompressOutlined style={{ fontSize: 14 }} />}
                            onClick={handleCollapseAll}
                            size="small"
                            className="text-gray-400 hover:text-violet-500 flex items-center justify-center w-7 h-7"
                        />
                    </AnimatedTooltip>

                    <div className="w-[1px] h-3 bg-gray-200 dark:bg-gray-700 mx-1" />

                    {onCreateSpace && (
                        <AnimatedTooltip content="New Space">
                            <Button
                                type="text"
                                icon={<FolderAddOutlined style={{ fontSize: 14 }} />}
                                onClick={onCreateSpace}
                                size="small"
                                className="text-gray-400 hover:text-violet-500 flex items-center justify-center w-7 h-7"
                            />
                        </AnimatedTooltip>
                    )}
                    {onAddSource && (
                        <AnimatedTooltip content="Add Source">
                            <Button
                                type="text"
                                icon={<PlusOutlined style={{ fontSize: 14 }} />}
                                onClick={onAddSource}
                                size="small"
                                className="text-gray-400 hover:text-violet-500 flex items-center justify-center w-7 h-7"
                            />
                        </AnimatedTooltip>
                    )}
                </div>
            }
            style={{
                display: 'flex',
                flexDirection: 'column',
                minHeight: 'calc(100vh - 200px)',
                background: 'transparent',
                backdropFilter: 'none',
                WebkitBackdropFilter: 'none',
                boxShadow: 'none',
                border: 'none',
                ...style
            }}
            className={`dark:!bg-transparent dark:!border-none ${className}`}
            styles={{
                header: {
                    background: 'transparent',
                    borderBottom: '1px solid rgba(139, 92, 246, 0.2)',
                    minHeight: 40,
                    padding: '0 12px'
                },
                body: {
                    padding: '12px 0',
                    flex: 1,
                    overflow: 'auto'
                }
            }}
        >
            <div className="px-3 mb-4 flex items-center gap-2">
                <Input
                    placeholder="Search catalog..."
                    prefix={<SearchOutlined style={{ color: token.colorTextPlaceholder, fontSize: 13 }} />}
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    size="small"
                    className="flex-1 rounded-md border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 h-8 hover:bg-white dark:hover:bg-gray-800 focus:bg-white dark:focus:bg-gray-800 transition-all"
                    allowClear
                />
                <AnimatedTooltip content="Refresh Catalog">
                    <Button
                        type="text"
                        icon={<ReloadOutlined style={{ fontSize: 13 }} />}
                        onClick={loadData}
                        size="small"
                        className="text-gray-400 hover:text-violet-500"
                    />
                </AnimatedTooltip>
            </div>

            <ConfigProvider
                theme={{
                    components: {
                        Tree: {
                            controlItemBgActive: '#7c3aed',
                            controlItemBgHover: 'rgba(139, 92, 246, 0.05)',
                            paddingXS: 4
                        }
                    }
                }}
            >
                <div className="px-1 custom-scrollbar overflow-x-hidden overflow-y-auto" style={{ maxHeight: 'calc(100vh - 280px)' }}>
                    {/* Spaces Section */}
                    {(filteredGroups.spaces.length > 0 || !searchValue) && (
                        <div className="mb-4">
                            {renderHeader("Spaces", treeGroups.spaces.length, 'spaces', onCreateSpace)}
                            {!collapsedSections['spaces'] && <Tree {...treeProps} treeData={filteredGroups.spaces} />}
                        </div>
                    )}

                    <div>
                        {renderHeader(
                            "Sources",
                            treeGroups.lakehouse.length + treeGroups.storage.length + treeGroups.databases.length,
                            'sources',
                            onAddSource
                        )}

                        {!collapsedSections['sources'] && (
                            <>
                                {/* Lakehouse Section */}
                                {(filteredGroups.lakehouse.length > 0 || !searchValue) && (
                                    <div className="mb-4">
                                        {renderHeader("Lakehouse Catalogs", treeGroups.lakehouse.length, 'lakehouse')}
                                        {!collapsedSections['lakehouse'] && <Tree {...treeProps} treeData={filteredGroups.lakehouse} />}
                                    </div>
                                )}

                                {/* Storage Section */}
                                {(filteredGroups.storage.length > 0 || !searchValue) && (
                                    <div className="mb-4">
                                        {renderHeader("Object Storage", treeGroups.storage.length, 'storage')}
                                        {!collapsedSections['storage'] && <Tree {...treeProps} treeData={filteredGroups.storage} />}
                                    </div>
                                )}

                                {/* Databases Section */}
                                {(filteredGroups.databases.length > 0 || !searchValue) && (
                                    <div className="mb-2">
                                        {renderHeader("Databases", treeGroups.databases.length, 'databases')}
                                        {!collapsedSections['databases'] && <Tree {...treeProps} treeData={filteredGroups.databases} />}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>

                <style jsx global>{`
                    .custom-dremio-tree .ant-tree-treenode {
                        padding: 0 4px !important;
                        margin-bottom: 2px;
                        width: 100%;
                    }
                    .custom-dremio-tree .ant-tree-node-content-wrapper {
                        padding: 0 4px !important;
                        border-radius: 4px;
                        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                        line-height: 28px;
                        height: 28px;
                    }
                    .custom-dremio-tree .ant-tree-switcher {
                        line-height: 28px !important;
                        display: flex !important;
                        align-items: center;
                        justify-content: center;
                        width: 16px !important;
                    }
                    .custom-dremio-tree .ant-tree-node-content-wrapper:hover {
                        background: rgba(124, 58, 237, 0.08) !important;
                    }
                    .custom-dremio-tree .ant-tree-node-selected {
                        background: none !important;
                        transition: none !important;
                    }
                `}</style>
            </ConfigProvider>
        </Card>
    );

}
