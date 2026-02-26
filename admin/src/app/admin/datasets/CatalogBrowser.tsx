
import React, { useEffect, useState, useMemo } from 'react';
import { Card, Spin, Empty, Breadcrumb, Button, Input, List, Typography, Tooltip, Tag, Row, Col, Statistic, Space, Select, Dropdown, Menu } from 'antd';
import {
    AppstoreOutlined,
    UnorderedListOutlined,
    ReloadOutlined,
    SearchOutlined,
    DatabaseOutlined,
    FolderOpenOutlined,
    CheckCircleOutlined,
    HomeOutlined,
    FilterOutlined,
    SortAscendingOutlined,
    SortDescendingOutlined,
    MenuFoldOutlined,
    MenuUnfoldOutlined,
    CloudServerOutlined,
    PlusOutlined
} from '@ant-design/icons';
import { dremioService, CatalogItem } from '@/lib/dremioService';
import { getTypeIcon } from './utils';
import { MagicButton } from '@/components/custom/MagicButton';

const { Text } = Typography;

interface CatalogBrowserProps {
    path: string[];
    id: string;
    type: string;
    onNavigate: (path: string[], type: string, id: string) => void;
    sidebarOpen?: boolean;
    onToggleSidebar?: () => void;
    onAddSource?: () => void;
}

export default function CatalogBrowser({ path, id, type, onNavigate, sidebarOpen, onToggleSidebar, onAddSource }: CatalogBrowserProps) {
    console.log("CatalogBrowser rendering:", { path, id, type });
    const [loading, setLoading] = useState(false);
    const [items, setItems] = useState<CatalogItem[]>([]);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState<string>('ALL');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [sourcesCount, setSourcesCount] = useState(0);

    useEffect(() => {
        dremioService.getSources().then(res => setSourcesCount(res.length)).catch(console.error);
    }, []);

    useEffect(() => {
        loadChildren();
    }, [id, path]);

    const loadChildren = async () => {
        try {
            setLoading(true);
            console.log("Loading children for:", { id, path, type });

            // Handle HOME/Root case
            if (type === 'HOME' || (!id && path.length === 0)) {
                const result = await dremioService.getCatalog();
                console.log("Root catalog result:", result);
                setItems(result || []);
                return;
            }

            // Prefer ID-based lookup for containers as it's more robust
            if (id) {
                const result = await dremioService.getCatalogChildren(id);
                console.log("Children result (by ID):", result);
                setItems(result || []);
            } else {
                // Fallback to path if ID is missing
                const result = await dremioService.getCatalogByPath(path);
                console.log("Children result (by Path):", result);
                setItems(result.children || []);
            }
        } catch (error) {
            console.error("Failed to load catalog children:", error);
            setItems([]);
        } finally {
            setLoading(false);
        }
    };

    const handleItemClick = (item: CatalogItem) => {
        onNavigate(item.path, item.type, item.id);
    };

    // Dremio-queryable file extensions
    const QUERYABLE_EXTENSIONS = ['xlsx', 'xls', 'csv', 'tsv', 'json', 'parquet', 'orc', 'avro'];

    const isQueryableFile = (item: CatalogItem): boolean => {
        if (item.type !== 'FILE') return true; // Non-FILE items always pass
        const name = item.path[item.path.length - 1] || '';
        const ext = name.split('.').pop()?.toLowerCase() || '';
        return QUERYABLE_EXTENSIONS.includes(ext);
    };

    const processedItems = useMemo(() => {
        // 0. Filter out non-queryable files
        let result = items.filter(isQueryableFile);

        // 1. Search Filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(item =>
                (item.path[item.path.length - 1] || '').toLowerCase().includes(query)
            );
        }

        // 2. Type Filter
        if (filterType !== 'ALL') {
            if (filterType === 'FOLDER') {
                result = result.filter(item => ['FOLDER', 'SPACE', 'SOURCE', 'HOME'].includes(item.type));
            } else if (filterType === 'DATASET') {
                result = result.filter(item => ['DATASET', 'PHYSICAL_DATASET', 'VIRTUAL_DATASET', 'DATASET_TABLE', 'DATASET_VIRTUAL', 'FILE'].includes(item.type));
            }
        }

        // 3. Sorting
        result = [...result].sort((a, b) => {
            const nameA = (a.path[a.path.length - 1] || '').toLowerCase();
            const nameB = (b.path[b.path.length - 1] || '').toLowerCase();
            return sortOrder === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
        });

        return result;
    }, [items, searchQuery, filterType, sortOrder]);

    const breadcrumbItems = [
        {
            title: <HomeOutlined />,
            onClick: () => onNavigate([], 'HOME', '')
        },
        ...path.map((p, index) => ({
            title: p,
            onClick: () => {
                const newPath = path.slice(0, index + 1);
                onNavigate(newPath, 'FOLDER', '');
            }
        }))
    ];

    const glassCardStyle = {
        background: 'rgba(255, 255, 255, 0.6)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.04)',
        border: '1px solid rgba(255, 255, 255, 0.5)',
    };

    const glassHeaderStyle = {
        background: 'rgba(255, 255, 255, 0.1)',
        borderBottom: '1px solid rgba(139, 92, 246, 0.2)',
    };

    const renderGridItem = (item: CatalogItem) => {
        const name = item.path[item.path.length - 1];

        return (
            <div
                key={item.id}
                onClick={() => handleItemClick(item)}
                className="group relative flex flex-col items-center justify-center p-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900/40 shadow-sm hover:border-violet-200 dark:hover:border-violet-900/50 hover:shadow-md hover:shadow-violet-500/10 transition-all cursor-pointer aspect-square"
            >
                <div className="mb-3 transform group-hover:scale-110 transition-transform duration-300">
                    <span className="flex text-[32px]">
                        {getTypeIcon(item.type, (item as any).containerType)}
                    </span>
                </div>
                <Text
                    className="text-center font-medium text-gray-700 dark:text-gray-300 group-hover:text-violet-600 dark:group-hover:text-violet-400 w-full truncate px-2"
                    style={{ fontSize: 13 }}
                >
                    {name}
                </Text>
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {item.type === 'FOLDER' && <Tag bordered={false} className="m-0 text-[10px] bg-orange-50 text-orange-600">DIR</Tag>}
                    {['DATASET', 'PHYSICAL_DATASET', 'VIRTUAL_DATASET', 'FILE'].includes(item.type) && <Tag bordered={false} className="m-0 text-[10px] bg-blue-50 text-blue-600">DS</Tag>}
                </div>
            </div>
        );
    };

    const renderListItem = (item: CatalogItem) => {
        const name = item.path[item.path.length - 1];
        return (
            <List.Item
                onClick={() => handleItemClick(item)}
                className="cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg px-2 transition-colors border-0 !border-b-0 mb-1"
                style={{ border: 'none' }}
            >
                <List.Item.Meta
                    avatar={<div className="mt-1">{getTypeIcon(item.type, (item as any).containerType)}</div>}
                    title={
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-200 group-hover:text-violet-600">
                            {name}
                        </span>
                    }
                    description={
                        <span className="text-xs text-gray-400">
                            {item.type.replace(/_/g, ' ')}
                        </span>
                    }
                />
            </List.Item>
        );
    };

    return (
        <div className="h-full flex flex-col gap-4 overflow-hidden">
            {/* Header Card */}
            <Card
                size="small"
                style={glassCardStyle}
                className="dark:!bg-[rgba(15,15,23,0.6)] dark:!border-purple-500/20"
                styles={{ header: glassHeaderStyle }}
                title={
                    <div className="flex items-center gap-3">
                        {onToggleSidebar && (
                            <Button
                                type="text"
                                icon={sidebarOpen ? <MenuFoldOutlined /> : <MenuUnfoldOutlined />}
                                onClick={onToggleSidebar}
                                className="text-gray-500 hover:text-violet-600"
                            />
                        )}
                        <span style={{ background: 'linear-gradient(to right, #8b5cf6, #6366f1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 600 }}>
                            {path[path.length - 1] || 'Catalog'}
                        </span>
                    </div>
                }
                extra={
                    <Space size={8}>
                        {/* Sources Count */}
                        <Tag icon={<CloudServerOutlined />} color="purple" bordered={false} className="px-2 py-0.5 text-[11px] bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400 rounded-md m-0">
                            {sourcesCount} Sources
                        </Tag>

                        {/* Search */}
                        <Input
                            prefix={<SearchOutlined className="text-gray-400" />}
                            placeholder="Filter..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-32 md:w-48 !bg-transparent border-b !border-0 focus:border-b-violet-500 transition-colors"
                            bordered={false}
                            size="small"
                        />

                        <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-1" />

                        {/* Filter Type */}
                        <Select
                            value={filterType}
                            onChange={setFilterType}
                            size="small"
                            bordered={false}
                            className="w-24 text-xs"
                            dropdownMatchSelectWidth={false}
                            suffixIcon={<FilterOutlined className="text-xs text-gray-400" />}
                            options={[
                                { value: 'ALL', label: 'All Types' },
                                { value: 'FOLDER', label: 'Folders' },
                                { value: 'DATASET', label: 'Datasets' },
                            ]}
                        />

                        {/* Sort Order */}
                        <Tooltip title={`Sort by Name (${sortOrder === 'asc' ? 'A-Z' : 'Z-A'})`}>
                            <Button
                                type="text"
                                size="small"
                                icon={sortOrder === 'asc' ? <SortAscendingOutlined /> : <SortDescendingOutlined />}
                                onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                                className="text-gray-400 hover:text-violet-600"
                            />
                        </Tooltip>

                        <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-1" />

                        {/* View Mode */}
                        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
                            <Button
                                type="text"
                                size="small"
                                icon={<AppstoreOutlined style={{ fontSize: 12 }} />}
                                className={viewMode === 'grid' ? 'bg-white dark:bg-gray-700 shadow-sm text-violet-600' : 'text-gray-400'}
                                onClick={() => setViewMode('grid')}
                                style={{ width: 24, height: 24, minWidth: 24 }}
                            />
                            <Button
                                type="text"
                                size="small"
                                icon={<UnorderedListOutlined style={{ fontSize: 12 }} />}
                                className={viewMode === 'list' ? 'bg-white dark:bg-gray-700 shadow-sm text-violet-600' : 'text-gray-400'}
                                onClick={() => setViewMode('list')}
                                style={{ width: 24, height: 24, minWidth: 24 }}
                            />
                        </div>

                        <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-1" />

                        {/* Refresh */}
                        <Tooltip title="Refresh">
                            <Button type="text" size="small" icon={<ReloadOutlined />} onClick={loadChildren} />
                        </Tooltip>

                        {/* Add Source */}
                        {onAddSource && (
                            <MagicButton
                                icon={<PlusOutlined style={{ fontSize: 10 }} />}
                                onClick={onAddSource}
                                size="small"
                            >
                                Add Source
                            </MagicButton>
                        )}
                    </Space>
                }
            >
                <Breadcrumb items={breadcrumbItems} className="text-xs" />
            </Card>

            {/* Stats Card */}
            <Card
                size="small"
                style={glassCardStyle}
                className="dark:!bg-[rgba(15,15,23,0.6)] dark:!border-purple-500/20"
                bodyStyle={{ padding: 12 }}
            >
                <Row gutter={16} align="middle" justify="start">
                    <Col>
                        <Statistic
                            title={<span className="text-[10px] text-gray-500 uppercase tracking-wider">Items</span>}
                            value={items.length}
                            valueStyle={{ color: '#8b5cf6', fontWeight: 600, fontSize: 16 }}
                            suffix={<span className="text-xs text-gray-400">total</span>}
                        />
                    </Col>
                    <Col>
                        <div className="h-8 w-px bg-gray-100 dark:bg-gray-800 mx-2" />
                    </Col>
                    <Col>
                        <Statistic
                            title={<span className="text-[10px] text-gray-500 uppercase tracking-wider">Type</span>}
                            value={type || 'Container'}
                            valueStyle={{ color: '#6366f1', fontWeight: 600, fontSize: 16 }}
                        />
                    </Col>
                </Row>
            </Card>

            {/* Content */}
            <div className="flex-1 overflow-auto custom-scrollbar">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
                        <Spin />
                        <span className="text-sm">Loading contents...</span>
                    </div>
                ) : processedItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                        <Empty
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                            description="No items found"
                        />
                    </div>
                ) : (
                    viewMode === 'grid' ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 pb-4">
                            {processedItems.map(renderGridItem)}
                        </div>
                    ) : (
                        <List
                            itemLayout="horizontal"
                            dataSource={processedItems}
                            renderItem={renderListItem}
                            className="w-full"
                        />
                    )
                )}
            </div>
        </div>
    );
}
