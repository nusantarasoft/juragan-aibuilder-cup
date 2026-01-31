import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Tree, Popconfirm, Button, message } from 'antd';
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
            // Always reload buckets to catch new/deleted buckets
            await loadBuckets();

            // If we have an active context, restore it
            if (currentBucket) {
                // Reload root of bucket
                await loadFoldersForBucket(currentBucket, '');
                // If deep in a path, reload that path's parent to ensure new folders show up
                if (currentPath) {
                    // safely reload current path content
                    await loadFoldersForBucket(currentBucket, currentPath);
                }
            }
        };
        refresh();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [refreshTrigger]);

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
            if (node.data?.type === 'folder' && node.data.path === parentPath) {
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
                        className="drag-handle cursor-grab text-gray-400 hover:text-gray-600 flex items-center justify-center"
                        onClick={(e) => { e.stopPropagation(); }}
                        style={{ width: 14, height: 24 }}
                    >
                        <HolderOutlined style={{ fontSize: 13 }} />
                    </span>
                )}

                {/* Icon */}
                <span className="custom-tree-icon flex items-center text-gray-400 shrink-0">
                    {isBucket && <DatabaseOutlined style={{ fontSize: 16 }} />}
                    {isFolder && <FolderOutlined style={{ fontSize: 16 }} />}
                </span>

                {/* Title - truncated with tooltip for full name */}
                <AnimatedTooltip content={node.title} position="top" usePortal={true}>
                    <span className="truncate text-left select-none text-gray-700 dark:text-gray-300 font-medium text-xs">
                        {node.title.length > 6 ? node.title.substring(0, 6) + '...' : node.title}
                    </span>
                </AnimatedTooltip>

                {/* Actions - Absolutely positioned far right (Anchors to .ant-tree-treenode) */}
                <div className="absolute top-0 bottom-0 flex flex-row-reverse items-center gap-1 bg-transparent" style={{ right: '8px', zIndex: 100 }}>
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
                                            className="!text-gray-400 hover:!text-red-500 !w-5 !h-5 !min-w-0 flex items-center justify-center !p-0"
                                            onClick={(e) => e.stopPropagation()}
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
                                    className="!text-gray-300 !w-5 !h-5 !min-w-0 flex items-center justify-center !p-0 cursor-not-allowed"
                                    onClick={(e) => e.stopPropagation()}
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
                                            className="!text-gray-400 hover:!text-red-500 !w-5 !h-5 !min-w-0 flex items-center justify-center !p-0"
                                            onClick={(e) => e.stopPropagation()}
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
                                    className="!text-gray-300 !w-5 !h-5 !min-w-0 flex items-center justify-center !p-0 cursor-not-allowed"
                                    onClick={(e) => e.stopPropagation()}
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
                                className="!text-gray-400 hover:!text-violet-500 !w-5 !h-5 !min-w-0 flex items-center justify-center !p-0"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onBucketSettings?.(node.data.name);
                                }}
                            />
                        </AnimatedTooltip>
                    )}
                </div>
            </div>
        );
    };

    return (
        <>
            <style jsx global>{`
                /* Tree Layout Fixes */
                .ant-tree .ant-tree-treenode {
                    width: 100% !important;
                    display: flex !important;
                    align-items: center; 
                    padding-bottom: 2px;
                    position: relative; /* Context for absolute children */
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
                    margin-right: -4px; /* Counter spacing to bring closer to drag grip */
                }
                .ant-tree-node-content-wrapper {
                    flex: 1 1 auto !important;
                    display: flex !important; 
                    align-items: center;
                    overflow: visible !important; /* For tooltips */
                    width: 100% !important;
                    min-width: 0 !important;
                    position: static !important; /* Allow absolute children to anchor to treenode row */
                    padding-right: 64px !important; /* Rigid space for far-right actions */
                    background: transparent !important;
                }
                .ant-tree-node-content-wrapper:hover {
                    background: rgba(139, 92, 246, 0.04) !important;
                }
                .ant-tree .ant-tree-draggable-icon {
                     display: none !important;
                }
                
                /* =========================================================================
                   HIDE ALL TREE LINES (User Preference - Reset)
                   ========================================================================= */
                
                /* Hide vertical connector lines */
                .ant-tree-indent-unit::before,
                .ant-tree-indent-unit-end::before {
                    display: none !important;
                }
                
                /* Hide horizontal connector lines from switcher */
                .ant-tree-switcher::before {
                    display: none !important;
                }
                
                /* =========================================================================
                   DROP INDICATOR (High Visibility)
                   ========================================================================= */
                .ant-tree-drop-indicator {
                    height: 2px !important;
                    background-color: #8b5cf6 !important; /* Violet-500 */
                    box-shadow: 0 0 8px rgba(139, 92, 246, 0.6);
                    z-index: 9999 !important; /* Always on top */
                    pointer-events: none;
                    border-radius: 1px;
                }
            `}</style >
            <DirectoryTree
                showLine={false}
                showIcon={false}
                switcherIcon={(props: any) => {
                    if (props.isLeaf) return null;
                    return props.expanded ?
                        <MinusSquareOutlined style={{ fontSize: 10, color: '#6b7280' }} /> :
                        <PlusSquareOutlined style={{ fontSize: 10, color: '#6b7280' }} />;
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
        </>
    );
});

FolderTree.displayName = 'FolderTree';
export default FolderTree;
