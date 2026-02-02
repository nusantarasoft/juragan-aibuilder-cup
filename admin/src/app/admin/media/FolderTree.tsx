import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Tree, Popconfirm, Button, message, ConfigProvider } from 'antd';
import type { TreeProps } from 'antd';
import {
    FolderOutlined,
    DatabaseOutlined,
    DeleteOutlined,
    SettingOutlined,
    HolderOutlined,
    PlusSquareOutlined,
    MinusSquareOutlined
} from '@ant-design/icons';
import { mediaService, S3Object } from '@/lib/mediaService';
import AnimatedTooltip from "@/components/mvpblocks/AnimatedTooltip";

export interface FolderTreeRef {
    expandAll: () => void;
    collapseAll: () => void;
}

interface FolderTreeProps {
    currentBucket: string;
    currentPath: string;
    onSelect: (bucket: string, path: string) => void;
    onRefresh: () => void;
    className?: string;
    style?: React.CSSProperties;
    onDeleteBucket?: (name: string) => void;
    onDeleteFolder?: (path: string, bucket: string) => void;
    onBucketSettings?: (name: string) => void;
    refreshTrigger?: number;
    isSystemBucketLocked?: boolean;
}

const FolderTree = forwardRef<FolderTreeRef, FolderTreeProps>(({
    currentBucket,
    currentPath,
    onSelect,
    onRefresh,
    className,
    style,
    onDeleteBucket,
    onDeleteFolder,
    onBucketSettings,
    refreshTrigger = 0,
    isSystemBucketLocked = true
}, ref) => {
    const [treeData, setTreeData] = useState<any[]>([]);

    // Debug Effect
    useEffect(() => {
        console.log('[FolderTree] Refresh triggered:', refreshTrigger);
    }, [refreshTrigger]);
    const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
    const [isMoving, setIsMoving] = useState(false);
    const [expandingDeep, setExpandingDeep] = useState(false);
    const { DirectoryTree } = Tree;

    const getAllKeys = (nodes: any[]) => {
        const allKeys: React.Key[] = [];
        const collectKeys = (nodes: any[]) => {
            nodes.forEach(node => {
                allKeys.push(node.key);
                if (node.children) {
                    collectKeys(node.children);
                }
            });
        };
        collectKeys(nodes);
        return allKeys;
    };

    // Expose expand/collapse methods to parent
    useImperativeHandle(ref, () => ({
        expandAll: () => {
            setExpandingDeep(true);
            setExpandedKeys(getAllKeys(treeData));
        },
        collapseAll: () => {
            setExpandingDeep(false);
            setExpandedKeys([]);
        }
    }));

    // Effect: Deep Expansion Recursion
    useEffect(() => {
        if (expandingDeep) {
            setExpandedKeys(prev => {
                const newKeys = getAllKeys(treeData);
                const uniqueKeys = new Set([...prev, ...newKeys]);
                if (uniqueKeys.size === prev.length) return prev;
                return Array.from(uniqueKeys);
            });
        }
    }, [treeData, expandingDeep]);

    // Initial Load & Auto Refresh
    useEffect(() => {
        const refresh = async () => {
            // 1. Reload buckets (Resets tree structure to roots only)
            const buckets = await mediaService.listBuckets();
            const nodes: any[] = buckets.map(b => ({
                title: b.name,
                key: `bucket::${b.name}`,
                icon: <DatabaseOutlined />,
                isLeaf: false,
                className: 'root-bucket',
                data: { type: 'bucket', name: b.name, path: '' }
            }));
            setTreeData(nodes);

            // 3. Collect unique buckets AND folders to load

            // Map of bucket -> Set of paths to load (always include '' for root)
            const bucketsMap = new Map<string, Set<string>>();

            // Helper to add path
            const addPath = (bucket: string, path: string) => {
                if (!bucketsMap.has(bucket)) {
                    bucketsMap.set(bucket, new Set([''])); // Always load root
                }
                const paths = bucketsMap.get(bucket)!;
                paths.add(path);
            };

            // a) Active Context
            if (currentBucket) {
                addPath(currentBucket, ''); // Root
                // Ensure current bucket is expanded in UI logic
                setExpandedKeys(prev => [...new Set([...prev, `bucket::${currentBucket}`])]);
            }

            // b) Expanded Keys (Buckets AND Folders)
            expandedKeys.forEach(key => {
                const k = String(key);
                if (k.startsWith('bucket::')) {
                    const bName = k.replace('bucket::', '');
                    addPath(bName, '');
                } else if (k.startsWith('folder::')) {
                    // key format: folder::bucketName::path/
                    const parts = k.split('::');
                    if (parts.length >= 3) {
                        const bName = parts[1];
                        const path = parts.slice(2).join('::'); // Handle path containing :: if any, though unlikely unique key
                        if (bName && path) {
                            addPath(bName, path);
                        }
                    }
                }
            });

            // 4. Sequential Load Order: Roots first, then Depth-first by path length
            // We iterate buckets, then for each bucket, sort paths by length
            for (const [bucket, paths] of bucketsMap.entries()) {
                const sortedPaths = Array.from(paths).sort((a, b) => a.length - b.length);

                for (const path of sortedPaths) {
                    await loadFoldersForBucket(bucket, path);
                }
            }

            // 4. If current path exists, reload deep path
            if (currentBucket && currentPath) {
                await loadFoldersForBucket(currentBucket, currentPath);
            }
        };
        refresh();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [refreshTrigger]); // expandedKeys included via closure, intentional


    const loadBuckets = async () => {
        const buckets = await mediaService.listBuckets();
        const nodes: any[] = buckets.map(b => ({
            title: b.name,
            key: `bucket::${b.name}`,
            icon: <DatabaseOutlined />,
            isLeaf: false,
            className: 'root-bucket',
            data: { type: 'bucket', name: b.name, path: '' }
        }));

        setTreeData(nodes);

        // If there's a current bucket, ensure it's expanded in UI state initially
        if (currentBucket) {
            setExpandedKeys(prev => [...new Set([...prev, `bucket::${currentBucket}`])]);
        }
    };

    const loadFoldersForBucket = async (bucketName: string, parentPath: string = '') => {

        const folders = await mediaService.listFolders(parentPath, bucketName);

        setTreeData((origin: any[]) => updateTreeData(origin, `bucket::${bucketName}`, parentPath, folders));
    };

    const updateTreeData = (list: any[], bucketKey: string, parentPath: string, folders: S3Object[]): any[] => {
        return list.map(node => {
            const nodeKey = node.key as string;
            // 1. Match Bucket Key
            if (nodeKey === bucketKey) {
                if (parentPath === '') {

                    return {
                        ...node,
                        children: folders.map(f => ({
                            title: f.key.replace(/\/$/, ''),
                            key: `folder::${bucketKey.split('::')[1]}::${f.key}`,
                            isLeaf: false,
                            icon: <FolderOutlined />,
                            data: { type: 'folder', bucket: bucketKey.split('::')[1], path: f.key, name: f.key.replace(/\/$/, '') }
                        }))
                    };
                }
                if (node.children) {
                    return { ...node, children: updateTreeData(node.children, bucketKey, parentPath, folders) };
                }
            }
            // 2. Match Folder Key
            const targetBucketName = bucketKey.replace('bucket::', '');
            if (node.data?.type === 'folder' && node.data.path === parentPath && node.data.bucket === targetBucketName) {

                return {
                    ...node,
                    children: folders.map(f => ({
                        title: f.key.replace(parentPath, '').replace(/\/$/, ''),
                        key: `folder::${node.data.bucket}::${f.key}`,
                        isLeaf: false,
                        icon: <FolderOutlined />,
                        data: { type: 'folder', bucket: node.data.bucket, path: f.key, name: f.key.replace(parentPath, '').replace(/\/$/, '') }
                    }))
                };
            }
            // Recursion
            if (node.children) {
                return { ...node, children: updateTreeData(node.children, bucketKey, parentPath, folders) };
            }
            return node;
        });
    };

    const onLoadData = ({ key, children }: any) => {
        return new Promise<void>(async (resolve) => {
            if (children && children.length > 0) {
                resolve();
                return;
            }
            const parts = (key as string).split('::');
            if (parts[0] === 'bucket') {
                const bucketName = parts[1];
                await loadFoldersForBucket(bucketName, '');
            } else if (parts[0] === 'folder') {
                const bucketName = parts[1];
                const path = parts[2];
                await loadFoldersForBucket(bucketName, path);
            }
            resolve();
        });
    };

    const onTreeSelect: TreeProps['onSelect'] = (selectedKeys, info: any) => {
        const key = selectedKeys[0] as string;
        if (!key) return;

        const parts = key.split('::');
        if (parts[0] === 'bucket') {
            onSelect(parts[1], '');
        } else if (parts[0] === 'folder') {
            onSelect(parts[1], parts[2]); // bucket, path
        }
    };

    const onDrop: TreeProps['onDrop'] = (info) => {
        const dropKey = info.node.key as string;
        const dragKey = info.dragNode.key as string;
        const dropPos = info.node.pos.split('-');
        const dropPosition = info.dropPosition - Number(dropPos[dropPos.length - 1]);

        const dropParts = dropKey.split('::');
        const dragParts = dragKey.split('::');

        let destBucket = '';
        let destPath = '';

        if (dropParts[0] === 'bucket') {
            destBucket = dropParts[1];
            destPath = '';
        } else if (dropParts[0] === 'folder') {
            destBucket = dropParts[1];
            destPath = dropParts[2];
        }

        let srcBucket = '';
        let srcPath = '';
        if (dragParts[0] === 'folder') {
            srcBucket = dragParts[1];
            srcPath = dragParts[2];
        } else {
            return;
        }

        // Optimistic UI Update
        const loop = (data: any[], key: string, callback: (item: any, index: number, arr: any[]) => void) => {
            for (let i = 0; i < data.length; i++) {
                if (data[i].key === key) {
                    return callback(data[i], i, data);
                }
                if (data[i].children) {
                    loop(data[i].children, key, callback);
                }
            }
        };

        const data = [...treeData];
        let dragObj: any;
        loop(data, dragKey, (item, index, arr) => {
            arr.splice(index, 1);
            dragObj = item;
        });

        if (!info.dropToGap) {
            loop(data, dropKey, (item) => {
                item.children = item.children || [];
                item.children.push(dragObj);
            });
        } else if (
            (info.node.children || []).length > 0 &&
            info.node.expanded &&
            dropPosition === 1 // On the bottom gap
        ) {
            loop(data, dropKey, (item) => {
                item.children = item.children || [];
                item.children.unshift(dragObj);
            });
        } else {
            let ar: any[] = [];
            let i: number = 0;
            loop(data, dropKey, (item, index, arr) => {
                ar = arr;
                i = index;
            });
            if (dropPosition === -1) {
                ar.splice(i, 0, dragObj);
            } else {
                ar.splice(i + 1, 0, dragObj);
            }
        }
        setTreeData(data); // Immediate local update

        mediaService.moveFolder(srcPath, destPath ? (destPath.endsWith('/') ? destPath : destPath + '/') + (srcPath.split('/').filter(Boolean).pop() || '') + '/' : (srcPath.split('/').filter(Boolean).pop() || '') + '/', srcBucket, destBucket)
            .then(async () => {
                // Still refresh to ensure server consistency, but UI is already updated
                await new Promise(r => setTimeout(r, 500));
                onRefresh();
            })
            .catch(() => {
                // Revert on failure (simple reload)
                onRefresh();
                message.error('Failed to move folder');
            });
    };

    const titleRender = (node: any) => {
        const isBucket = node.data?.type === 'bucket';
        const isFolder = node.data?.type === 'folder';

        // Calculate Selection State Logic
        let isSelected = false;
        if (isBucket) {
            isSelected = (currentBucket === node.data.name) && (!currentPath);
        } else if (isFolder) {
            isSelected = (currentBucket === node.data.bucket) && (currentPath === node.data.path);
        }

        const iconColor = isSelected ? '#ffffff' : '#9ca3af'; // White vs Gray-400
        const dragHandleColor = isSelected ? 'rgba(255, 255, 255, 0.7)' : '#9ca3af';
        const actionBtnColor = isSelected ? 'rgba(255, 255, 255, 0.9)' : '#9ca3af';

        return (
            <div className="flex items-center w-full group/tree-node h-full pr-16" style={{ gap: 4, minHeight: 28 }}>
                {/* Drag Handle */}
                {(node.data?.name === 'ns-system' || node.data?.bucket === 'ns-system') && isSystemBucketLocked ? (
                    <span
                        className="flex items-center justify-center cursor-not-allowed opacity-30"
                        onClick={(e) => { e.stopPropagation(); }}
                        style={{ width: 14, height: 24 }}
                    >
                        <HolderOutlined style={{ fontSize: 13 }} />
                    </span>
                ) : (
                    <span
                        className="drag-handle cursor-grab flex items-center justify-center"
                        onClick={(e) => { e.stopPropagation(); }}
                        style={{ width: 14, height: 24, color: dragHandleColor }}
                    >
                        <HolderOutlined style={{ fontSize: 13 }} />
                    </span>
                )}

                {/* Icon */}
                <span className="custom-tree-icon flex items-center shrink-0" style={{ color: iconColor }}>
                    {isBucket && <DatabaseOutlined style={{ fontSize: 16 }} />}
                    {isFolder && <FolderOutlined style={{ fontSize: 16 }} />}
                </span>

                {/* Title - truncated with tooltip for full name */}
                <AnimatedTooltip content={node.title} position="top" usePortal={true}>
                    <span
                        className="truncate text-left select-none font-medium text-xs text-xs text-gray-700 dark:text-gray-300"
                        style={{ color: isSelected ? '#ffffff' : undefined }}
                    >
                        {node.title.length > 6 ? node.title.substring(0, 6) + '...' : node.title}
                    </span>
                </AnimatedTooltip>

                {/* Actions - Absolutely positioned far right (Anchors to .ant-tree-treenode) */}
                <div
                    className="absolute top-0 bottom-0 flex flex-row-reverse items-center gap-1 bg-transparent"
                    style={{ right: '8px', zIndex: 100 }}
                    onClick={(e) => e.stopPropagation()} // Stop propagation HERE, allowing child clicks to bubble to Popconfirm first
                >
                    {isBucket && (
                        (node.data.name !== 'ns-system' || !isSystemBucketLocked) ? (
                            <Popconfirm
                                title="Delete Bucket"
                                description={node.data.name === 'ns-system' ? "WARNING: This is a system bucket!" : "Are you sure? This cannot be undone."}
                                onConfirm={(e) => {
                                    e?.stopPropagation();
                                    onDeleteBucket?.(node.data.name);
                                }}
                                onCancel={(e) => e?.stopPropagation()}
                                okText="Yes"
                                cancelText="No"
                            >
                                <div> {/* Wrapper for tooltip on disabled/popconfirm */}
                                    <AnimatedTooltip content="Delete Bucket" usePortal={true}>
                                        <Button
                                            type="text"
                                            size="small"
                                            icon={<DeleteOutlined />}
                                            className="!w-5 !h-5 !min-w-0 flex items-center justify-center !p-0"
                                            style={{ color: actionBtnColor }}
                                        />
                                    </AnimatedTooltip>
                                </div>
                            </Popconfirm>
                        ) : (
                            <AnimatedTooltip content="System Protected" usePortal={true}>
                                <Button
                                    type="text"
                                    size="small"
                                    icon={<DeleteOutlined />}
                                    disabled={true}
                                    className="!w-5 !h-5 !min-w-0 flex items-center justify-center !p-0 cursor-not-allowed"
                                    style={{ color: '#d1d5db' }} // gray-300
                                />
                            </AnimatedTooltip>
                        )
                    )}
                    {isFolder && (
                        (node.data?.bucket !== 'ns-system' || !isSystemBucketLocked) ? (
                            <Popconfirm
                                title="Delete Folder"
                                description="Are you sure?"
                                onConfirm={(e) => {
                                    e?.stopPropagation();

                                    onDeleteFolder?.(node.data.path, node.data.bucket);
                                }}
                                onCancel={(e) => e?.stopPropagation()}
                            >
                                <div>
                                    <AnimatedTooltip content="Delete Folder" usePortal={true}>
                                        <Button
                                            type="text"
                                            size="small"
                                            icon={<DeleteOutlined />}
                                            className="!w-5 !h-5 !min-w-0 flex items-center justify-center !p-0"
                                            style={{ color: actionBtnColor }}
                                        />
                                    </AnimatedTooltip>
                                </div>
                            </Popconfirm>
                        ) : (
                            <AnimatedTooltip content="System Protected" usePortal={true}>
                                <Button
                                    type="text"
                                    size="small"
                                    icon={<DeleteOutlined />}
                                    disabled={true}
                                    className="!w-5 !h-5 !min-w-0 flex items-center justify-center !p-0 cursor-not-allowed"
                                    style={{ color: '#d1d5db' }}
                                />
                            </AnimatedTooltip>
                        )
                    )}
                    {isBucket && (
                        <AnimatedTooltip content="Settings" usePortal={true}>
                            <Button
                                type="text"
                                size="small"
                                icon={<SettingOutlined />}
                                className="!w-5 !h-5 !min-w-0 flex items-center justify-center !p-0"
                                style={{ color: actionBtnColor }}
                                onClick={(e) => {
                                    // Settings still needs explicit handling or rely on container?
                                    // Verify if Popconfirm is involved. No.
                                    // So we can leave onClick here calling prop, but we don't need stopPropagation if container has it.
                                    // BUT, button onClick fires BEFORE container onClick.
                                    // So we can just call the handler.
                                    onBucketSettings?.(node.data.name);
                                }}
                            />
                        </AnimatedTooltip>
                    )}
                </div>
                {/* Debug Badge */}
                <div className="absolute top-0 right-0 text-[8px] opacity-30 pointer-events-none" style={{ color: isSelected ? 'rgba(255,255,255,0.3)' : 'transparent' }}>v3.0</div>
            </div>
        );
    };

    // Construct Selected Keys from Props
    const getSelectedKeys = () => {
        if (!currentBucket) return [];
        if (!currentPath) return [`bucket::${currentBucket}`];
        return [`folder::${currentBucket}::${currentPath}`];
    };

    return (
        <ConfigProvider
            theme={{
                components: {
                    Tree: {
                        controlItemBgActive: 'rgba(139, 92, 246, 0.12)', // Violet-500 @ 12%
                        controlItemBgHover: 'rgba(139, 92, 246, 0.04)',
                        colorText: '#374151', // Gray-700
                        colorPrimary: '#7c3aed', // Violet-600
                    }
                }
            }}
        >
            <style jsx global>{`
                /* Tree Layout Fixes */
                .ant-tree .ant-tree-treenode {
                    width: 100% !important;
                    display: flex !important;
                    align-items: center; 
                    padding-bottom: 2px;
                    position: relative;
                }
                .ant-tree-list-holder-inner {
                    align-items: stretch !important;
                }
                .ant-tree-title {
                    width: 100% !important;
                    position: static !important;
                }
                .ant-tree .ant-tree-switcher {
                    width: 7px !important; 
                    flex: 0 0 7px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: transparent; 
                    position: relative;
                    z-index: 10;
                    margin-right: 3px;
                    margin-left: 8px;
                }
                .ant-tree-node-content-wrapper {
                    flex: 1 1 auto !important;
                    display: flex !important; 
                    align-items: center;
                    overflow: visible !important;
                    width: 100% !important;
                    min-width: 0 !important;
                    position: static !important;
                    padding-right: 64px !important;
                    background: transparent !important;
                }

                /* Active State Styling via ConfigProvider + CSS Polish - FIXED VISIBILITY */
                
                /* Force Solid Violet Background on Selection */
                .ant-tree .ant-tree-treenode-selected .ant-tree-node-content-wrapper {
                    background-color: #7c3aed !important; /* Violet-600 */
                    border-radius: 6px !important;
                }

                /* Force Text Color on Selection - WHITE for Contrast */
                .ant-tree .ant-tree-treenode-selected .ant-tree-title span, 
                .ant-tree .ant-tree-treenode-selected .ant-tree-title {
                    color: #ffffff !important;
                    font-weight: 600 !important;
                }

                /* Force Icon Color on Selection - WHITE - AND FORCE VISIBILITY */
                .ant-tree .ant-tree-treenode-selected .custom-tree-icon {
                    color: #ffffff !important;
                    display: flex !important;
                    visibility: visible !important;
                    opacity: 1 !important;
                    z-index: 20;
                }
                
                /* Force Action Buttons Color on Selection - WHITE/Transparent */
                .ant-tree .ant-tree-treenode-selected button {
                     color: rgba(255, 255, 255, 0.9) !important;
                }
                .ant-tree .ant-tree-treenode-selected button:hover {
                     color: #ffffff !important;
                     background-color: rgba(255, 255, 255, 0.2) !important;
                }

                /* Force Switcher (Expand/Collapse) Color on Selection */
                .ant-tree .ant-tree-treenode-selected .ant-tree-switcher span,
                .ant-tree .ant-tree-treenode-selected .ant-tree-switcher svg {
                    color: rgba(255, 255, 255, 0.9) !important;
                    fill: rgba(255, 255, 255, 0.9) !important;
                }
                
                /* Force Drag Handle (HolderOutlined) Color on Selection - AND FORCE VISIBILITY */
                .ant-tree .ant-tree-treenode-selected .drag-handle, 
                .ant-tree .ant-tree-treenode-selected .drag-handle span,
                .ant-tree .ant-tree-treenode-selected .drag-handle svg {
                     color: rgba(255, 255, 255, 0.7) !important;
                     display: flex !important;
                     visibility: visible !important;
                     opacity: 1 !important;
                     z-index: 20;
                }
                
                .ant-tree .ant-tree-treenode-selected .drag-handle:hover,
                .ant-tree .ant-tree-treenode-selected .drag-handle:hover span,
                .ant-tree .ant-tree-treenode-selected .drag-handle:hover svg {
                     color: #ffffff !important;
                }

                /* Hover State (Non-selected) */
                .ant-tree .ant-tree-node-content-wrapper:hover {
                    background: rgba(139, 92, 246, 0.05) !important;
                }

                /* Remove default AntD directory highlights */
                .ant-tree.ant-tree-directory .ant-tree-treenode::before {
                    display: none !important;
                }
                .ant-tree .ant-tree-draggable-icon {
                     display: none !important;
                }
                
                /* Hide lines */
                .ant-tree-indent-unit::before,
                .ant-tree-indent-unit-end::before,
                .ant-tree-switcher::before {
                    display: none !important;
                }
                
                /* Drop Indicator */
                .ant-tree-drop-indicator {
                    height: 2px !important;
                    background-color: #8b5cf6 !important;
                    box-shadow: 0 0 8px rgba(139, 92, 246, 0.6);
                    z-index: 9999 !important;
                    pointer-events: none;
                    border-radius: 1px;
                }
            `}</style >
            <DirectoryTree
                showLine={false}
                showIcon={false}
                selectedKeys={getSelectedKeys()}
                switcherIcon={(props: any) => {
                    const iconStyle = { fontSize: 10, color: props.selected ? 'white' : '#6b7280' };
                    if (props.isLeaf) return null;
                    return props.expanded ?
                        <MinusSquareOutlined style={iconStyle} /> :
                        <PlusSquareOutlined style={iconStyle} />;
                }}
                disabled={isMoving}
                blockNode
                draggable={(node: any) => {
                    if (isSystemBucketLocked && (node.data?.name === 'ns-system' || node.data?.bucket === 'ns-system')) {
                        return false;
                    }
                    return true;
                }}
                onDrop={onDrop}
                onSelect={onTreeSelect}
                loadData={onLoadData}
                treeData={treeData}
                expandedKeys={expandedKeys}
                onExpand={setExpandedKeys}
                className={className}
                style={{ background: 'transparent', ...style }}
                titleRender={titleRender}
                expandAction="click"
            />
        </ConfigProvider>
    );
});

FolderTree.displayName = 'FolderTree';
export default FolderTree;
