"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { useTheme } from "next-themes";
import CMSLayout from "@/components/layout/CMSLayout";
import AnimatedTooltip from "@/components/mvpblocks/AnimatedTooltip";

import {
    Card,
    Button,
    Space,
    Upload,
    Modal,
    Input,
    message,
    Image,
    Spin,
    Tag,
    Empty,
    Progress,
    Tooltip,
    Dropdown,
    Row,
    Col,
    Tree,
    Breadcrumb,
    Statistic,
    Switch,
    Form,
    InputNumber,
    Select,
    Divider,
    Drawer,
    List,
    Typography,
    Popconfirm,
    Table,
    Segmented,
    FloatButton,
} from "antd";
import {
    UploadOutlined,
    DeleteOutlined,
    EyeOutlined,
    SearchOutlined,
    FileImageOutlined,
    VideoCameraOutlined,
    FileOutlined,
    CopyOutlined,
    CheckOutlined,
    AppstoreOutlined,
    UnorderedListOutlined,
    BarsOutlined,
    MoreOutlined,
    FolderOutlined,
    FolderOpenOutlined,
    FolderAddOutlined,
    DownloadOutlined,
    EditOutlined,
    PictureOutlined,
    SettingOutlined,
    DatabaseOutlined,
    HistoryOutlined,
    CloudOutlined,
    PlusOutlined,
    HomeOutlined,
    ReloadOutlined,
    SwapOutlined,
    ScissorOutlined,
    ToolOutlined,
    ThunderboltOutlined,
    ExperimentOutlined,
    RobotOutlined,
} from "@ant-design/icons";
import { MagicButton } from "@/components/custom/MagicButton";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import Hyperspeed from "@/components/react-bits/Hyperspeed";
import { hyperspeedPresets } from "@/components/react-bits/HyperSpeedPresets";
import MetaBalls from "@/components/react-bits/MetaBalls";
import type { DataNode, TreeProps } from "antd/es/tree";
import { mediaService, MediaFile, S3Object, S3Bucket, StorageStats, LifecycleRule } from "@/lib/mediaService";

// Animated components
const PremiumButton = ({ children, onClick, icon, className, style, ...props }: any) => {
    return (
        <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`
                px-4 py-1.5 
                bg-gradient-to-r from-violet-600 to-indigo-600 
                hover:from-violet-500 hover:to-indigo-500
                text-white 
                rounded-lg 
                shadow-md hover:shadow-lg hover:shadow-indigo-500/30
                transition-all duration-200
                flex items-center gap-2 
                text-xs font-medium
                ${className || ''}
            `}
            onClick={onClick}
            style={style}
            {...props}
        >
            {icon}
            {children}
        </motion.button>
    );
};

const ScaleButton = ({ children, onClick, className, icon, ...props }: any) => (
    <motion.div
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className={`cursor-pointer inline-flex items-center justify-center rounded-md p-1 transition-colors hover:bg-white/10 ${className || ''}`}
        onClick={onClick}
        {...props}
    >
        {icon || children}
    </motion.div>
);
import BucketSettingsDrawer from "./BucketSettingsDrawer";
import VersionHistoryModal from "./VersionHistoryModal";
import UploadModal from './UploadModal';
import MediaDetailDrawer from './MediaDetailDrawer';
import AIStudioDrawer from './AIStudioDrawer';

const { Text, Title } = Typography;

export default function MediaLibraryPage() {
    // Theme state - use resolvedTheme which gives the actual resolved value
    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    // Theme detection: only evaluate after mount when resolvedTheme is available
    // resolvedTheme is 'dark' or 'light' (never 'system' after resolution)
    const isDark = mounted && resolvedTheme === 'dark';

    // Memoize the preset to ensure it updates correctly when theme changes
    // Dark mode = cyberpunk (dark road, neon lights), Light mode = akira (white road, warm orange)
    // NOTE: isDark evaluates opposite to expected in practice, so we swap the assignment
    const currentPreset = useMemo(() => {
        // Only compute after mount when resolvedTheme is reliable
        if (!mounted) return hyperspeedPresets.akira; // Default for SSR (will be light initially)
        // SWAPPED: isDark seems to evaluate opposite in this context
        const preset = isDark ? hyperspeedPresets.akira : hyperspeedPresets.cyberpunk;
        console.log('[Preset Debug] isDark:', isDark, 'resolvedTheme:', resolvedTheme, 'Using preset:', isDark ? 'akira' : 'cyberpunk');
        return preset;
    }, [isDark, resolvedTheme, mounted]);

    // Force Hyperspeed remount when theme changes - use counter for reliable update
    const [themeKey, setThemeKey] = useState(0);
    useEffect(() => {
        if (mounted) {
            console.log('[Theme Debug] Theme changed, incrementing themeKey. resolvedTheme:', resolvedTheme);
            setThemeKey(prev => prev + 1);
        }
    }, [resolvedTheme, mounted]);

    // ... existing core state ...
    const [media, setMedia] = useState<MediaFile[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [selectedMedia, setSelectedMedia] = useState<MediaFile | null>(null);
    const [previewVisible, setPreviewVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [viewMode, setViewMode] = useState<"grid" | "list" | "detail">("grid");
    const [copiedId, setCopiedId] = useState<string | null>(null);

    // Folder state
    const [currentPath, setCurrentPath] = useState("");
    const [newFolderModalVisible, setNewFolderModalVisible] = useState(false);
    const [newFolderName, setNewFolderName] = useState("");

    // Bucket state
    const [buckets, setBuckets] = useState<S3Bucket[]>([]);
    const [currentBucket, setCurrentBucket] = useState<string>("");
    const [newBucketModalVisible, setNewBucketModalVisible] = useState(false);
    const [newBucketName, setNewBucketName] = useState("");

    // Settings & stats
    const [storageStats, setStorageStats] = useState<StorageStats | null>(null);
    const [bucketVersioning, setBucketVersioning] = useState<Record<string, boolean>>({});
    const [lifecycleRules, setLifecycleRules] = useState<LifecycleRule[]>([]);
    const [lifecycleModalVisible, setLifecycleModalVisible] = useState(false);
    const [bucketSettingsDrawerVisible, setBucketSettingsDrawerVisible] = useState(false);

    // Version history
    const [versionHistoryVisible, setVersionHistoryVisible] = useState(false);
    const [versionHistoryFile, setVersionHistoryFile] = useState<MediaFile | null>(null);

    // Multi-bucket tree state
    const [foldersByBucket, setFoldersByBucket] = useState<Record<string, S3Object[]>>({});
    const [expandedTreeKeys, setExpandedTreeKeys] = useState<string[]>([]);

    // Move/Copy state
    const [moveModalVisible, setMoveModalVisible] = useState(false);
    const [selectedFileForMove, setSelectedFileForMove] = useState<MediaFile | null>(null);
    const [moveDestinationBucket, setMoveDestinationBucket] = useState("");
    const [moveDestinationPath, setMoveDestinationPath] = useState("");
    const [isCopyMode, setIsCopyMode] = useState(false);

    // AI & Upload State
    const [uploadModalVisible, setUploadModalVisible] = useState(false);
    const [aiStudioVisible, setAIStudioVisible] = useState(false);

    // Load initial data
    useEffect(() => {
        loadAllData();
    }, []);

    // Reload when bucket changes
    useEffect(() => {
        if (currentBucket) {
            loadMedia();
            fetchBucketVersioningStatus(currentBucket);
        }
    }, [currentBucket]);

    // Reload when path changes
    useEffect(() => {
        loadMedia();
    }, [currentPath]);


    const loadAllData = async () => {
        setLoading(true);
        await Promise.all([
            loadMedia(),
            loadBuckets(),
            loadStorageStats(),

        ]);
        setLoading(false);
    };

    const loadMedia = async () => {
        try {
            // Load files from S3 for current bucket/path, not from DB
            const s3Files = await mediaService.listFilesInFolder(currentPath);
            // Filter out folders, only show files
            const files = s3Files.filter(f => !f.isFolder);
            // Map S3 objects to MediaFile format for display
            const mappedFiles: MediaFile[] = files.map(f => ({
                id: f.key,
                filename: f.key.split('/').pop() || f.key,
                url: `${process.env.NEXT_PUBLIC_S3_ENDPOINT || 'http://localhost:9000'}/${currentBucket || 'cms-media'}/${f.key}`,
                s3_key: f.key,
                mime_type: getMimeType(f.key),
                size_bytes: f.size,
                created_at: f.lastModified,
            }));
            setMedia(mappedFiles);
        } catch (error) {
            console.warn("Error loading media:", error);
            setMedia([]);
        }
    };

    // Load folders for a specific bucket (lazy loading)
    const loadFoldersForBucket = async (bucketName: string) => {
        try {
            // Pass the bucket name to get folders for that specific bucket
            const bucketFolders = await mediaService.listFolders('', bucketName);
            setFoldersByBucket(prev => ({ ...prev, [bucketName]: bucketFolders }));
        } catch (error) {
            console.warn(`Error loading folders for ${bucketName}:`, error);
            // Set empty array to indicate we tried loading (not undefined)
            setFoldersByBucket(prev => ({ ...prev, [bucketName]: [] }));
        }
    };

    // Build unified tree with buckets as top-level, folders as children
    // Using useMemo ensures stable tree data that only rebuilds when buckets or folders change
    const folderTreeData = useMemo<DataNode[]>(() => {
        return buckets.map(bucket => {
            const bucketFolders = foldersByBucket[bucket.name];
            const hasFoldersLoaded = bucketFolders !== undefined;

            const baseNode: DataNode = {
                key: `bucket:${bucket.name}`,
                // Always show expand icon for buckets (they can always have folders)
                isLeaf: false,
                title: <div style={{ display: 'flex', alignItems: 'center', height: 24, gap: 6, width: '100%', paddingRight: 4 }}>
                    <DatabaseOutlined style={{ fontSize: 14, flexShrink: 0, color: '#8c8c8c' }} />
                    <span style={{ fontSize: 12, fontWeight: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {bucket.name}
                    </span>
                    {hasFoldersLoaded && bucketFolders.length > 0 && (
                        <span style={{ fontSize: 10, color: '#8c8c8c', marginLeft: 4 }}>
                            ({bucketFolders.length})
                        </span>
                    )}
                    <Button
                        type="text"
                        size="small"
                        icon={<SettingOutlined style={{ fontSize: 12 }} />}
                        style={{ marginLeft: 'auto', flexShrink: 0 }}
                        onClick={(e) => {
                            e.stopPropagation();
                            setCurrentBucket(bucket.name);
                            loadLifecycleRules();
                            fetchBucketVersioningStatus(bucket.name);
                            setBucketSettingsDrawerVisible(true);
                        }}
                    />
                    <Popconfirm
                        title="Delete bucket?"
                        description="This action cannot be undone."
                        onConfirm={(e) => { e?.stopPropagation(); handleDeleteBucket(bucket.name); }}
                        onCancel={(e) => e?.stopPropagation()}
                        okText="Delete"
                        cancelText="Cancel"
                    >
                        <DeleteOutlined
                            style={{
                                color: '#ff4d4f',
                                fontSize: 12,
                                flexShrink: 0,
                            }}
                            onClick={(e) => e.stopPropagation()}
                        />
                    </Popconfirm>
                </div>,
            };

            // Only add children if folders have been loaded for this bucket
            if (hasFoldersLoaded) {
                baseNode.children = bucketFolders.map(f => {
                    const folderName = f.key.replace(/\/$/, "").split("/").pop() || '';
                    return {
                        key: `folder:${bucket.name}:${f.key}`,
                        isLeaf: true,
                        title: (
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                height: 24,
                                gap: 6,
                                width: '100%',
                                minWidth: 0,
                                paddingRight: 4 // Reduced padding
                            }}>
                                <FolderOutlined style={{ fontSize: 14, flexShrink: 0 }} />
                                <span style={{
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    flex: 1,
                                    marginRight: 4,
                                    fontSize: 12,
                                    lineHeight: '24px'
                                }}>
                                    {folderName}
                                </span>
                                <Popconfirm
                                    title="Delete folder?"
                                    onConfirm={(e) => { e?.stopPropagation(); handleDeleteFolder(f.key); }}
                                    onCancel={(e) => e?.stopPropagation()}
                                    okText="Delete"
                                    cancelText="Cancel"
                                >
                                    <DeleteOutlined
                                        style={{
                                            color: '#ff4d4f',
                                            fontSize: 12,
                                            flexShrink: 0,
                                            marginLeft: 'auto'
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                </Popconfirm>
                            </div>
                        ),
                    };
                });
            }

            return baseNode;
        });
    }, [buckets, foldersByBucket]);

    // Handle tree selection - parse bucket vs folder
    const handleTreeSelect = (keys: React.Key[]) => {
        if (keys.length === 0) return;
        const key = String(keys[0]);
        if (key.startsWith('bucket:')) {
            const bucketName = key.replace('bucket:', '');
            setCurrentBucket(bucketName);
            setCurrentPath(''); // Reset path when switching buckets
            // Auto-expand the bucket when clicked and load its folders
            if (!expandedTreeKeys.includes(key)) {
                setExpandedTreeKeys(prev => [...prev, key]);
            }
            if (!foldersByBucket[bucketName]) {
                loadFoldersForBucket(bucketName);
            }
        } else if (key.startsWith('folder:')) {
            // Format: folder:bucketName:path/
            const parts = key.replace('folder:', '').split(':');
            const bucketName = parts[0];
            const folderPath = parts.slice(1).join(':');
            setCurrentBucket(bucketName);
            setCurrentPath(folderPath);
        }
    };

    // Handle tree expand - update expanded keys and load folders
    // When clicking the switcher, Ant Design passes the new complete set of keys
    // We need to properly handle both expand and collapse
    const handleTreeExpand = (expandedKeys: React.Key[], info: { node: DataNode; expanded: boolean; nativeEvent: MouseEvent }) => {
        const keyStrings = expandedKeys.map(String);

        // Get the node key that was toggled
        const toggledKey = String(info.node.key);

        // If this is a bucket being expanded/collapsed
        if (toggledKey.startsWith('bucket:')) {
            if (info.expanded) {
                // Expanding: add to current keys (merge)
                setExpandedTreeKeys(prev => {
                    const newKeys = [...new Set([...prev, toggledKey])];
                    return newKeys;
                });
                // Load folders for this bucket
                const bucketName = toggledKey.replace('bucket:', '');
                if (!foldersByBucket[bucketName]) {
                    loadFoldersForBucket(bucketName);
                }
            } else {
                // Collapsing: remove from current keys
                setExpandedTreeKeys(prev => prev.filter(k => k !== toggledKey));
            }
        } else {
            // For folder nodes, just use the default behavior
            setExpandedTreeKeys(keyStrings);
        }
    };

    const loadBuckets = async () => {
        try {
            const bucketList = await mediaService.listBuckets();
            setBuckets(bucketList);
            if (!currentBucket && bucketList.length > 0) {
                const defaultBucket = await mediaService.getDefaultBucket();
                const initialBucket = defaultBucket || bucketList[0].name;
                setCurrentBucket(initialBucket);
                // Auto-expand and load folders for initial bucket
                setExpandedTreeKeys([`bucket:${initialBucket}`]);
                loadFoldersForBucket(initialBucket);
            }
        } catch (error) {
            console.warn("Error loading buckets:", error);
        }
    };

    const loadStorageStats = async () => {
        try {
            const stats = await mediaService.getStorageStats();
            setStorageStats(stats);
        } catch (error) {
            console.warn("Error loading stats:", error);
        }
    };



    const loadLifecycleRules = async () => {
        try {
            const rules = await mediaService.getLifecycleRules();
            setLifecycleRules(rules);
        } catch (error) {
            console.warn("Error loading lifecycle rules:", error);
        }
    };

    // Upload handler
    const handleUpload = async (file: File) => {
        setUploading(true);
        setUploadProgress(0);

        const progressInterval = setInterval(() => {
            setUploadProgress((prev) => Math.min(prev + 10, 90));
        }, 200);

        try {
            const result = await mediaService.uploadMedia(file, {
                folder: currentPath || "uploads",
            });

            clearInterval(progressInterval);
            setUploadProgress(100);

            if (result.success && result.media) {
                setMedia([result.media, ...media]);
                message.success(`${file.name} uploaded successfully!`);
                loadStorageStats();
            } else {
                throw new Error(result.error || "Upload failed");
            }
        } catch (error: any) {
            clearInterval(progressInterval);
            message.error(`Upload failed: ${error.message}`);
        }

        setTimeout(() => {
            setUploading(false);
            setUploadProgress(0);
        }, 500);
    };

    // Delete handler
    const handleDelete = async (id: string) => {
        Modal.confirm({
            title: "Delete Media?",
            content: "This action cannot be undone.",
            okText: "Delete",
            okType: "danger",
            onOk: async () => {
                const success = await mediaService.deleteMedia(id);
                if (success) {
                    setMedia(media.filter((m) => m.id !== id));
                    message.success("Media deleted");
                    loadStorageStats();
                } else {
                    message.error("Failed to delete media");
                }
            },
        });
    };

    // Folder operations
    const handleCreateFolder = async () => {
        if (!newFolderName.trim()) {
            message.warning("Please enter a folder name");
            return;
        }
        const folderPath = currentPath ? `${currentPath}${newFolderName}/` : `${newFolderName}/`;
        const success = await mediaService.createFolder(folderPath, currentBucket);
        if (success) {
            message.success(`Folder "${newFolderName}" created`);
            setNewFolderModalVisible(false);
            setNewFolderName("");
            loadFoldersForBucket(currentBucket);
        } else {
            message.error("Failed to create folder");
        }
    };

    const handleDeleteFolder = async (path: string) => {
        Modal.confirm({
            title: "Delete Folder?",
            content: "This will delete the folder and all its contents.",
            okText: "Delete",
            okType: "danger",
            onOk: async () => {
                const success = await mediaService.deleteFolder(path);
                if (success) {
                    message.success("Folder deleted");
                    loadFoldersForBucket(currentBucket);
                } else {
                    message.error("Failed to delete folder");
                }
            },
        });
    };

    // Bucket operations
    const handleCreateBucket = async () => {
        if (!newBucketName.trim()) {
            message.warning("Please enter a bucket name");
            return;
        }
        const success = await mediaService.createBucket(newBucketName);
        if (success) {
            message.success(`Bucket "${newBucketName}" created`);
            setNewBucketModalVisible(false);
            setNewBucketName("");
            loadBuckets();
        } else {
            message.error("Failed to create bucket");
        }
    };

    const handleDeleteBucket = async (name: string) => {
        Modal.confirm({
            title: "Delete Bucket?",
            content: "This will delete the bucket and all its contents.",
            okText: "Delete",
            okType: "danger",
            onOk: async () => {
                const success = await mediaService.deleteBucket(name);
                if (success) {
                    message.success("Bucket deleted");
                    loadBuckets();
                } else {
                    message.error("Failed to delete bucket");
                }
            },
        });
    };

    const handleMakeBucketPublic = async () => {
        const success = await mediaService.makeBucketPublic(currentBucket);
        if (success) {
            message.success("Bucket is now public");
        } else {
            message.error("Failed to make bucket public");
        }
    };

    // Versioning operations

    const fetchBucketVersioningStatus = async (bucketName: string) => {
        try {
            const status = await mediaService.getVersioningStatus(bucketName);
            setBucketVersioning(prev => ({ ...prev, [bucketName]: status === 'Enabled' }));
        } catch (error) {
            console.warn(`Error loading versioning status for ${bucketName}:`, error);
        }
    };

    const handleToggleVersioning = async (enabled: boolean) => {
        if (!currentBucket) return;

        const success = enabled
            ? await mediaService.enableVersioning(currentBucket)
            : await mediaService.disableVersioning(currentBucket);

        if (success) {
            setBucketVersioning(prev => ({ ...prev, [currentBucket]: enabled }));
            message.success(`Versioning ${enabled ? "enabled" : "disabled"} for ${currentBucket}`);
        } else {
            message.error("Failed to update versioning");
        }
    };

    const handleViewVersionHistory = (file: MediaFile) => {
        if (!file.s3_key) {
            message.warning("No S3 key available for this file");
            return;
        }
        setVersionHistoryFile(file);
        setVersionHistoryVisible(true);
    };

    // Move/Copy operations
    const handleMoveFile = async () => {
        if (!selectedFileForMove?.s3_key) return;

        const destBucket = moveDestinationBucket || currentBucket;
        const destPath = moveDestinationPath ?
            (moveDestinationPath.endsWith('/') ? moveDestinationPath : moveDestinationPath + '/') : '';
        const filename = selectedFileForMove.s3_key.split('/').pop() || selectedFileForMove.filename;
        const fullDestKey = `${destPath}${filename}`;

        // For cross-bucket operations, the backend needs to handle it differently
        // For now, use the existing API if same bucket
        const success = isCopyMode
            ? await mediaService.copyFile(selectedFileForMove.s3_key, fullDestKey)
            : await mediaService.moveFile(selectedFileForMove.s3_key, fullDestKey);

        if (success) {
            message.success(`File ${isCopyMode ? "copied" : "moved"} successfully`);
            setMoveModalVisible(false);
            setMoveDestinationBucket("");
            setMoveDestinationPath("");
            loadMedia();
        } else {
            message.error(`Failed to ${isCopyMode ? "copy" : "move"} file`);
        }
    };

    // Download handler
    const handleDownload = async (file: MediaFile) => {
        try {
            const url = await mediaService.getMediaUrl(file.id);
            if (url) {
                window.open(url, "_blank");
            } else {
                message.error("Failed to get download URL");
            }
        } catch (error) {
            message.error("Failed to download file");
        }
    };

    // AI Operations
    const handleGenerateEmbeddings = async (file: MediaFile) => {
        message.loading({ content: 'Generating embeddings...', key: 'embeddings' });
        // Determine content type - if image, backend handles it. If text/pdf, logic is in backend.
        // For now, pass empty content string as backend fetches file from S3
        const success = await mediaService.generateMediaEmbeddings(file.id, "");
        if (success) {
            message.success({ content: 'Embeddings generated successfully!', key: 'embeddings' });
        } else {
            message.error({ content: 'Failed to generate embeddings', key: 'embeddings' });
        }
    };

    const handleSendToLabelStudio = async (file: MediaFile) => {
        message.loading({ content: 'Sending to Label Studio...', key: 'labelstudio' });
        const success = await mediaService.sendToLabelStudio(file.id, file.url);
        if (success) {
            message.success({ content: 'Sent to Label Studio project!', key: 'labelstudio' });
        } else {
            message.error({ content: 'Failed to send to Label Studio', key: 'labelstudio' });
        }
    };

    const handleAutoLabelMedia = async (file: MediaFile) => {
        message.loading({ content: 'Auto-labeling media...', key: 'autolabel' });
        try {
            const tags = await mediaService.autoLabelMedia(file.id);
            if (tags && tags.length > 0) {
                message.success({ content: `Labeled: ${tags.join(', ')}`, key: 'autolabel', duration: 5 });
                // Optimistically update UI or reload
                loadAllData();
            } else {
                message.warning({ content: 'No tags generated', key: 'autolabel' });
            }
        } catch (error) {
            console.error(error);
            message.error({ content: 'Auto-labeling failed', key: 'autolabel' });
        }
    };

    // Utility functions
    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        message.success("Copied to clipboard");
        setTimeout(() => setCopiedId(null), 2000);
    };

    const getMimeType = (filename: string): string => {
        const ext = filename.split('.').pop()?.toLowerCase() || '';
        const mimeTypes: Record<string, string> = {
            'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png',
            'gif': 'image/gif', 'webp': 'image/webp', 'svg': 'image/svg+xml',
            'mp4': 'video/mp4', 'webm': 'video/webm', 'mov': 'video/quicktime',
            'pdf': 'application/pdf', 'doc': 'application/msword',
            'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        };
        return mimeTypes[ext] || 'application/octet-stream';
    };

    const formatFileSize = (bytes?: number) => {
        if (!bytes) return "Unknown";
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
        return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    };

    const getFileIcon = (mimeType?: string) => {
        if (!mimeType) return <FileOutlined />;
        if (mimeType.startsWith("image/")) return <FileImageOutlined />;
        if (mimeType.startsWith("video/")) return <VideoCameraOutlined />;
        return <FileOutlined />;
    };

    const filteredMedia = media.filter(
        (m) =>
            m.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
            m.alt_text?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Breadcrumb items
    const breadcrumbItems = [
        {
            title: <span className="cursor-pointer flex items-center gap-1" onClick={() => { setCurrentPath(""); setSearchQuery(""); }}><HomeOutlined /> {currentBucket}</span>,
        },
        ...currentPath.split("/").filter(Boolean).map((segment, index, arr) => ({
            title: <span className="cursor-pointer" onClick={() => setCurrentPath(arr.slice(0, index + 1).join("/") + "/")}>{segment}</span>,
        })),
    ];

    // File action menu
    const getFileActions = (item: MediaFile) => ({
        items: [
            { key: "preview", label: "Preview", icon: <EyeOutlined />, onClick: () => { setSelectedMedia(item); setPreviewVisible(true); } },
            { key: "download", label: "Download", icon: <DownloadOutlined />, onClick: () => handleDownload(item) },
            { key: "copy-url", label: "Copy URL", icon: <CopyOutlined />, onClick: () => copyToClipboard(item.url, item.id) },
            { type: "divider" as const },
            { key: "move", label: "Move to...", icon: <SwapOutlined />, onClick: () => { setSelectedFileForMove(item); setIsCopyMode(false); setMoveModalVisible(true); } },
            { key: "copy", label: "Copy to...", icon: <ScissorOutlined />, onClick: () => { setSelectedFileForMove(item); setIsCopyMode(true); setMoveModalVisible(true); } },
            ...(bucketVersioning[currentBucket] ? [{ key: "versions", label: "Version History", icon: <HistoryOutlined />, onClick: () => handleViewVersionHistory(item) }] : []),
            { type: "divider" as const },
            { type: "divider" as const },
            { key: "ai-embeddings", label: "Generate Embeddings", icon: <ExperimentOutlined />, onClick: () => handleGenerateEmbeddings(item) },
            { key: "auto-label", label: "Auto Label", icon: <ThunderboltOutlined />, onClick: () => handleAutoLabelMedia(item) },
            { key: "ai-label", label: "Label Studio", icon: <RobotOutlined />, onClick: () => handleSendToLabelStudio(item) },
            { type: "divider" as const },
            { key: "delete", label: "Delete", icon: <DeleteOutlined />, danger: true, onClick: () => handleDelete(item.id) },
        ],
    });

    // Grid item renderer
    const renderGridItem = (item: MediaFile) => (
        <Col key={item.id} xs={24} sm={12} md={6} lg={6}>
            <Card
                hoverable
                size="small"
                className="cursor-pointer transition-all hover:shadow-md hover:border-blue-400"
                styles={{ body: { padding: 12 } }}
                cover={
                    item.mime_type?.startsWith("image/") ? (
                        <div style={{ height: 194, overflow: "hidden", background: "#fafafa", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: '8px 8px 0 0' }}>
                            <Image
                                src={item.url}
                                alt={item.alt_text || item.filename}
                                style={{ objectFit: "cover", width: "100%", height: 194 }}
                                preview={false}
                                onClick={() => { setSelectedMedia(item); setPreviewVisible(true); }}
                            />
                        </div>
                    ) : (
                        <div
                            className="bg-gradient-to-br from-violet-600 to-indigo-600"
                            style={{
                                height: 194,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 48,
                                color: "rgba(255,255,255,0.9)",
                                borderRadius: '8px 8px 0 0'
                            }}
                        >
                            {getFileIcon(item.mime_type)}
                        </div>
                    )
                }
                actions={[
                    <AnimatedTooltip key="preview" content="Preview" position="bottom">
                        <EyeOutlined onClick={() => { setSelectedMedia(item); setPreviewVisible(true); }} />
                    </AnimatedTooltip>,
                    <AnimatedTooltip key="download" content="Download" position="bottom">
                        <DownloadOutlined onClick={() => handleDownload(item)} />
                    </AnimatedTooltip>,
                    <Dropdown key="more" menu={getFileActions(item)} trigger={["click"]}>
                        <MoreOutlined />
                    </Dropdown>,
                ]}
            >
                <div className="flex flex-col gap-1">
                    <AnimatedTooltip content={item.filename} position="bottom">
                        <div className="text-xs font-medium truncate">
                            {item.filename}
                        </div>
                    </AnimatedTooltip>
                    <Tag style={{ fontSize: 10, margin: 0, width: 'fit-content' }}>{formatFileSize(item.size_bytes)}</Tag>
                </div>
            </Card>
        </Col>
    );

    return (
        <CMSLayout
            title={<AuroraText colors={["#9333ea", "#7c3aed", "#6366f1", "#00ffff", "#ff00ff"]}>Media Library</AuroraText>}
            subTitle={
                <div className="flex items-center h-full pt-1">
                    <DecryptedText
                        text="Manage your media files and folders"
                        className="text-gray-700 dark:text-gray-200"
                        animateOn="both"
                        sequential={true}
                        speed={80}
                        maxIterations={15}
                        revealDirection="center"
                    />
                </div>
            }
            extra={[
                <Space key="stats">
                    {storageStats && (
                        <>
                            <Tag icon={<DatabaseOutlined />} color="blue">
                                {storageStats.totalFiles} files
                            </Tag>
                            <Tag icon={<CloudOutlined />} color="green">
                                {formatFileSize(storageStats.totalSizeBytes)}
                            </Tag>
                        </>
                    )}
                </Space>,
                <Space key="actions">
                    <Input
                        placeholder="Search media..."
                        prefix={<SearchOutlined />}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{ width: 180 }}
                        allowClear
                    />

                    <Segmented
                        value={viewMode}
                        onChange={(val) => setViewMode(val as "grid" | "list" | "detail")}
                        options={[
                            { value: "grid", icon: <AppstoreOutlined /> },
                            { value: "list", icon: <UnorderedListOutlined /> },
                            { value: "detail", icon: <BarsOutlined /> },
                        ]}
                        size="small"
                    />

                    <Space>
                        <PremiumButton icon={<ReloadOutlined />} onClick={loadAllData} className="from-slate-500 to-slate-600">
                            Refresh
                        </PremiumButton>
                        <PremiumButton icon={<CloudOutlined />} onClick={() => setUploadModalVisible(true)}>
                            Upload
                        </PremiumButton>
                    </Space>
                </Space>,
            ]}
        >
            {/* Content Wrapper */}
            <div className="relative" style={{ zIndex: 1 }}>
                <Row gutter={[32, 24]} align="top">
                    <Col xs={24} sm={8} md={6} lg={5}>
                        <div style={{ position: 'sticky', top: 16 }}>
                            <Card
                                size="small"
                                title={
                                    <span className="text-white font-semibold flex items-center gap-2">
                                        <DatabaseOutlined />Explorer
                                    </span>
                                }
                                extra={
                                    <Space size={4}>
                                        <AnimatedTooltip content="New Folder">
                                            <ScaleButton onClick={() => setNewFolderModalVisible(true)} className="p-1">
                                                <FolderAddOutlined style={{ color: 'white', fontSize: '16px' }} />
                                            </ScaleButton>
                                        </AnimatedTooltip>
                                        <AnimatedTooltip content="New Bucket">
                                            <ScaleButton onClick={() => setNewBucketModalVisible(true)} className="p-1">
                                                <PlusOutlined style={{ color: 'white', fontSize: '16px' }} />
                                            </ScaleButton>
                                        </AnimatedTooltip>
                                    </Space>
                                }
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    // Removed overflow: hidden to allow tooltips to show
                                    minHeight: 'calc(100vh - 200px)',
                                    background: 'rgba(255, 255, 255, 0.6)',
                                    backdropFilter: 'blur(16px)',
                                    WebkitBackdropFilter: 'blur(16px)',
                                    boxShadow: '0 8px 32px rgba(139, 92, 246, 0.1)',
                                    border: '1px solid rgba(139, 92, 246, 0.15)'
                                }}
                                className="dark:!bg-[rgba(15,15,23,0.7)] dark:!border-purple-500/20"
                                styles={{
                                    header: {
                                        background: 'linear-gradient(135deg, #9333ea 0%, #7c3aed 50%, #6366f1 100%)',
                                        borderRadius: '8px 8px 0 0',
                                        borderBottom: 'none'
                                    },
                                    body: {
                                        padding: 12,
                                        flex: 1,
                                        overflow: 'auto'
                                    }
                                }}
                            >
                                <Tree
                                    showLine={{ showLeafIcon: false }}
                                    expandedKeys={expandedTreeKeys}
                                    onExpand={handleTreeExpand}
                                    treeData={folderTreeData}
                                    onSelect={handleTreeSelect}
                                    selectedKeys={[
                                        currentPath ? `folder:${currentBucket}:${currentPath}` : `bucket:${currentBucket}`
                                    ]}
                                    className="[&_.ant-tree-treenode]:py-0.5 [&_.ant-tree-title]:text-xs [&_.ant-tree-switcher]:w-4"
                                    blockNode
                                />
                            </Card>
                        </div>
                    </Col>

                    {/* Main Content */}
                    <Col xs={24} sm={16} md={18} lg={19}>
                        {/* Breadcrumb */}
                        <Card
                            size="small"
                            style={{
                                marginBottom: 16,
                                display: 'flex',
                                flexDirection: 'column',
                                background: 'rgba(255, 255, 255, 0.6)',
                                backdropFilter: 'blur(16px)',
                                WebkitBackdropFilter: 'blur(16px)',
                                boxShadow: '0 8px 32px rgba(139, 92, 246, 0.1)',
                                border: '1px solid rgba(139, 92, 246, 0.15)'
                            }}
                            className="dark:!bg-[rgba(15,15,23,0.7)] dark:!border-purple-500/20"
                            styles={{
                                header: {
                                    background: 'linear-gradient(135deg, #9333ea 0%, #7c3aed 50%, #6366f1 100%)',
                                    borderRadius: '8px 8px 0 0'
                                },
                                body: {
                                    flex: 1,
                                    display: 'flex',
                                    flexDirection: 'column'
                                }
                            }}
                            title={
                                <span className="text-white font-semibold flex items-center gap-2">
                                    <PictureOutlined />Media Files
                                </span>
                            }
                        >
                            <Space>
                                <Breadcrumb items={breadcrumbItems} />
                                <AnimatedTooltip content="Refresh files">
                                    <ScaleButton size="small" icon={<ReloadOutlined />} onClick={loadAllData} />
                                </AnimatedTooltip>
                                {currentPath && (
                                    <Popconfirm
                                        title="Delete this folder?"
                                        description="This will delete the folder and all its contents."
                                        onConfirm={() => handleDeleteFolder(currentPath)}
                                        okText="Delete"
                                        cancelText="Cancel"
                                    >
                                        <AnimatedTooltip content="Delete current folder">
                                            <Button size="small" danger icon={<DeleteOutlined />}>Delete Folder</Button>
                                        </AnimatedTooltip>
                                    </Popconfirm>
                                )}
                            </Space>
                        </Card>

                        {/* Storage Dashboard */}
                        {storageStats && (
                            <Card
                                size="small"
                                style={{
                                    marginBottom: 16,
                                    background: 'rgba(255, 255, 255, 0.6)',
                                    backdropFilter: 'blur(16px)',
                                    WebkitBackdropFilter: 'blur(16px)',
                                    boxShadow: '0 8px 32px rgba(139, 92, 246, 0.08)',
                                    border: '1px solid rgba(139, 92, 246, 0.12)'
                                }}
                                className="dark:!bg-[rgba(15,15,23,0.7)] dark:!border-purple-500/20"
                                styles={{
                                    body: { padding: 16 }
                                }}
                            >
                                <Row gutter={24} align="middle">
                                    <Col span={6}>
                                        <Statistic
                                            title={
                                                <Tooltip title="Total files in the current folder">
                                                    <span className="flex items-center gap-1 cursor-help"><FileOutlined /> Bucket Files</span>
                                                </Tooltip>
                                            }
                                            value={storageStats.totalFiles}
                                            valueStyle={{ color: '#1890ff', fontWeight: 600 }}
                                        />
                                    </Col>
                                    <Col span={6}>
                                        <Statistic
                                            title={<><CloudOutlined /> Storage Used</>}
                                            value={formatFileSize(storageStats.totalSizeBytes)}
                                            valueStyle={{ color: '#52c41a', fontWeight: 600 }}
                                        />
                                    </Col>
                                    <Col span={6}>
                                        <Statistic
                                            title={<><DatabaseOutlined /> Buckets</>}
                                            value={buckets.length}
                                            suffix={<Tag color="blue" style={{ marginLeft: 8 }}>{currentBucket}</Tag>}
                                            valueStyle={{ fontWeight: 600 }}
                                        />
                                    </Col>
                                    <Col span={6}>
                                        <div className="flex items-center gap-2">
                                            <Statistic
                                                title={<><HistoryOutlined /> Versioning</>}
                                                value={bucketVersioning[currentBucket] ? 'Enabled' : 'Disabled'}
                                                valueStyle={{
                                                    color: bucketVersioning[currentBucket] ? '#52c41a' : '#faad14',
                                                    fontWeight: 600,
                                                    fontSize: 16
                                                }}
                                            />
                                        </div>
                                    </Col>
                                </Row>
                            </Card>
                        )}

                        {/* Upload Progress */}
                        {uploading && (
                            <Card size="small" style={{ marginBottom: 16 }}>
                                <Progress percent={uploadProgress} status="active" />
                            </Card>
                        )}

                        {/* Media Views */}
                        {loading ? (
                            <div style={{ textAlign: "center", padding: 60 }}>
                                <Spin size="large" />
                            </div>
                        ) : filteredMedia.length === 0 ? (
                            <Empty
                                description={
                                    <span className="text-gray-600 dark:text-gray-300">
                                        {searchQuery ? "No matching media found" : "No media in this folder"}
                                    </span>
                                }
                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                                className="py-16"
                            >
                                {!searchQuery && (
                                    <MagicButton
                                        icon={<UploadOutlined />}
                                        size="large"
                                        onClick={() => setUploadModalVisible(true)}
                                    >
                                        Upload First File
                                    </MagicButton>
                                )}
                            </Empty>
                        ) : viewMode === "grid" ? (
                            <Row gutter={[16, 16]}>{filteredMedia.map(renderGridItem)}</Row>
                        ) : viewMode === "list" ? (
                            <List
                                dataSource={filteredMedia}
                                renderItem={(item) => (
                                    <List.Item
                                        style={{ background: '#fff', padding: '8px 12px', marginBottom: 4, borderRadius: 4 }}
                                        actions={[
                                            <AnimatedTooltip content="Preview"><Button key="preview" type="text" icon={<EyeOutlined />} onClick={() => { setSelectedMedia(item); setPreviewVisible(true); }} /></AnimatedTooltip>,
                                            <AnimatedTooltip content="Download"><Button key="download" type="text" icon={<DownloadOutlined />} onClick={() => handleDownload(item)} /></AnimatedTooltip>,
                                            <Dropdown key="more" menu={getFileActions(item)} trigger={["click"]}><Button type="text" icon={<MoreOutlined />} /></Dropdown>,
                                        ]}
                                    >
                                        <List.Item.Meta
                                            avatar={
                                                item.mime_type?.startsWith("image/") ? (
                                                    <Image src={item.url} alt={item.filename} style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 4 }} preview={false} />
                                                ) : (
                                                    <div style={{ width: 48, height: 48, display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f5f5", borderRadius: 4, fontSize: 24 }}>
                                                        {getFileIcon(item.mime_type)}
                                                    </div>
                                                )
                                            }
                                            title={<span style={{ fontWeight: 500 }}>{item.filename}</span>}
                                            description={<Space size="small"><Tag>{formatFileSize(item.size_bytes)}</Tag><Tag>{item.mime_type?.split('/')[1] || 'file'}</Tag></Space>}
                                        />
                                    </List.Item>
                                )}
                            />
                        ) : (
                            <Table
                                dataSource={filteredMedia}
                                rowKey="id"
                                size="small"
                                pagination={{ pageSize: 20, showSizeChanger: true }}
                                columns={[
                                    {
                                        title: 'Preview',
                                        dataIndex: 'url',
                                        key: 'preview',
                                        width: 60,
                                        render: (url: string, record: MediaFile) => (
                                            record.mime_type?.startsWith("image/") ? (
                                                <Image src={url} alt={record.filename} style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 4 }} preview={false} />
                                            ) : (
                                                <div style={{ width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f5f5", borderRadius: 4, fontSize: 20 }}>
                                                    {getFileIcon(record.mime_type)}
                                                </div>
                                            )
                                        )
                                    },
                                    {
                                        title: 'Filename',
                                        dataIndex: 'filename',
                                        key: 'filename',
                                        ellipsis: true,
                                        sorter: (a: MediaFile, b: MediaFile) => a.filename.localeCompare(b.filename),
                                    },
                                    {
                                        title: 'Type',
                                        dataIndex: 'mime_type',
                                        key: 'type',
                                        width: 100,
                                        render: (mime: string) => <Tag>{mime?.split('/')[1] || 'file'}</Tag>,
                                    },
                                    {
                                        title: 'Size',
                                        dataIndex: 'size_bytes',
                                        key: 'size',
                                        width: 100,
                                        render: (size: number) => formatFileSize(size),
                                        sorter: (a: MediaFile, b: MediaFile) => (a.size_bytes || 0) - (b.size_bytes || 0),
                                    },
                                    {
                                        title: 'Created',
                                        dataIndex: 'created_at',
                                        key: 'created',
                                        width: 140,
                                        render: (date: string) => date ? new Date(date).toLocaleDateString() : '-',
                                        sorter: (a: MediaFile, b: MediaFile) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime(),
                                    },
                                    {
                                        title: 'Actions',
                                        key: 'actions',
                                        width: 120,
                                        render: (_: any, record: MediaFile) => (
                                            <Space size={0}>
                                                <AnimatedTooltip content="Preview"><Button type="text" size="small" icon={<EyeOutlined />} onClick={() => { setSelectedMedia(record); setPreviewVisible(true); }} /></AnimatedTooltip>
                                                <AnimatedTooltip content="Download"><Button type="text" size="small" icon={<DownloadOutlined />} onClick={() => handleDownload(record)} /></AnimatedTooltip>
                                                <Dropdown menu={getFileActions(record)} trigger={["click"]}><Button type="text" size="small" icon={<MoreOutlined />} /></Dropdown>
                                            </Space>
                                        )
                                    },
                                ]}
                            />
                        )}
                    </Col>
                </Row>
            </div>

            {/* Preview Modal */}
            <Modal
                open={previewVisible}
                title={selectedMedia?.filename}
                footer={null}
                onCancel={() => setPreviewVisible(false)}
                width={800}
            >
                {selectedMedia?.mime_type?.startsWith("image/") ? (
                    <Image src={selectedMedia.url} alt={selectedMedia.alt_text || selectedMedia.filename} style={{ width: "100%" }} preview={false} />
                ) : (
                    <div style={{ textAlign: "center", padding: 40 }}>
                        <div style={{ fontSize: 72, color: "#999", marginBottom: 16 }}>{getFileIcon(selectedMedia?.mime_type)}</div>
                        <p>{selectedMedia?.filename}</p>
                    </div>
                )}
                <div style={{ marginTop: 16 }}>
                    <Space>
                        <Tag>{selectedMedia?.mime_type}</Tag>
                        <Tag>{formatFileSize(selectedMedia?.size_bytes)}</Tag>
                    </Space>
                </div>
                <div style={{ marginTop: 16 }}>
                    <Input
                        value={selectedMedia?.url}
                        addonAfter={<CopyOutlined style={{ cursor: "pointer" }} onClick={() => selectedMedia && copyToClipboard(selectedMedia.url, selectedMedia.id)} />}
                        readOnly
                    />
                </div>
            </Modal>

            {/* New Folder Modal */}
            <Modal
                title="Create New Folder"
                open={newFolderModalVisible}
                onOk={handleCreateFolder}
                onCancel={() => setNewFolderModalVisible(false)}
            >
                <Input
                    placeholder="Folder name"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    prefix={<FolderOutlined />}
                />
            </Modal>

            {/* New Bucket Modal */}
            <Modal
                title="Create New Bucket"
                open={newBucketModalVisible}
                onOk={handleCreateBucket}
                onCancel={() => setNewBucketModalVisible(false)}
            >
                <Input
                    placeholder="Bucket name (lowercase, no spaces)"
                    value={newBucketName}
                    onChange={(e) => setNewBucketName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                    prefix={<DatabaseOutlined />}
                />
            </Modal>

            {/* Move/Copy Modal */}
            <Modal
                title={`${isCopyMode ? "Copy" : "Move"} to Different Location`}
                open={moveModalVisible}
                onOk={handleMoveFile}
                onCancel={() => setMoveModalVisible(false)}
                okText={isCopyMode ? "Copy" : "Move"}
            >
                <div className="flex flex-col gap-4">
                    <div>
                        <Text type="secondary">File:</Text>
                        <div className="flex items-center gap-2 mt-1">
                            <FileOutlined />
                            <Text strong>{selectedFileForMove?.filename}</Text>
                        </div>
                    </div>
                    <Divider style={{ margin: '8px 0' }} />
                    <div>
                        <Text type="secondary">Destination Bucket:</Text>
                        <Select
                            value={moveDestinationBucket || currentBucket}
                            onChange={setMoveDestinationBucket}
                            style={{ width: '100%', marginTop: 4 }}
                            options={buckets.map(b => ({ value: b.name, label: b.name }))}
                        />
                    </div>
                    <div>
                        <Text type="secondary">Destination Folder:</Text>
                        <Input
                            placeholder="e.g., uploads/images/ (leave empty for root)"
                            value={moveDestinationPath}
                            onChange={(e) => setMoveDestinationPath(e.target.value)}
                            prefix={<FolderOutlined />}
                            style={{ marginTop: 4 }}
                        />
                    </div>
                </div>
            </Modal>

            {/* Version History Modal */}
            <VersionHistoryModal
                visible={versionHistoryVisible}
                onClose={() => setVersionHistoryVisible(false)}
                fileKey={versionHistoryFile?.s3_key || ''}
                filename={versionHistoryFile?.filename || ''}
            />

            {/* Bucket Settings Drawer - Direct to Advanced Settings */}
            <BucketSettingsDrawer
                visible={bucketSettingsDrawerVisible}
                onClose={() => setBucketSettingsDrawerVisible(false)}
                bucket={currentBucket}
                buckets={buckets}
                storageStats={storageStats}
                onDeleteBucket={handleDeleteBucket}
                onMakePublic={handleMakeBucketPublic}
                onCreateBucket={async (name: string) => {
                    const success = await mediaService.createBucket(name);
                    if (success) {
                        message.success(`Bucket "${name}" created successfully`);
                        loadAllData();
                    }
                    return success;
                }}
                onDuplicateBucket={async (sourceName: string, targetName: string) => {
                    message.info('Duplicating bucket... This may take a while.');
                    // For now, create the new bucket (full duplication would require copying all objects)
                    const success = await mediaService.createBucket(targetName);
                    if (success) {
                        message.success(`Bucket "${targetName}" created (duplication feature coming soon)`);
                        loadAllData();
                    }
                    return success;
                }}
            />

            {/* AI Studio Floating Button */}
            <FloatButton
                icon={<RobotOutlined />}
                type="primary"
                style={{ right: 24, bottom: 24, width: 60, height: 60 }}
                onClick={() => setAIStudioVisible(true)}
                tooltip="Open AI Studio"
            />

            {/* New Modals & Drawers */}
            <UploadModal
                visible={uploadModalVisible}
                onClose={() => setUploadModalVisible(false)}
                onUploadSuccess={() => { loadAllData(); }}
                currentFolder={currentPath}
                bucket={currentBucket}
            />

            <MediaDetailDrawer
                visible={!!selectedMedia && !previewVisible} // Only show if not previewing (or handle overlap)
                media={selectedMedia}
                onClose={() => setSelectedMedia(null)}
                onRefresh={loadAllData}
            />

            <AIStudioDrawer
                visible={aiStudioVisible}
                onClose={() => setAIStudioVisible(false)}
            />

        </CMSLayout >
    );
}
