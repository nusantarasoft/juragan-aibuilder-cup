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
    Badge,
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
    ExclamationCircleOutlined,
    ToolOutlined,
    ThunderboltOutlined,
    ExperimentOutlined,
    RobotOutlined,
    LoadingOutlined,
    InfoCircleOutlined,
    MenuFoldOutlined,
    MenuUnfoldOutlined,
    LayoutOutlined,
    FilePdfOutlined,
    FileWordOutlined,
    FileExcelOutlined,
    FileTextOutlined,
    FileZipOutlined,
    FilePptOutlined,
    AudioOutlined,
    FileUnknownOutlined,
    SafetyCertificateOutlined,
    ExpandAltOutlined,
    CompressOutlined,
    TableOutlined,
    CloudServerOutlined,
} from "@ant-design/icons";

import { MagicButton } from "@/components/custom/MagicButton";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import Hyperspeed from "@/components/react-bits/Hyperspeed";
import { hyperspeedPresets } from "@/components/react-bits/HyperSpeedPresets";
import MetaBalls from "@/components/react-bits/MetaBalls";
import type { DataNode, TreeProps } from "antd/es/tree";
import { mediaService, MediaFile, S3Object, S3Bucket, StorageStats, LifecycleRule } from "@/lib/mediaService";
import FolderTree, { FolderTreeRef } from "./FolderTree";

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
import MediaPreviewModal from './MediaPreviewModal';
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
    const [showExplorer, setShowExplorer] = useState(true);
    const folderTreeRef = React.useRef<FolderTreeRef>(null);

    // Folder state
    const [currentPath, setCurrentPath] = useState("");

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
    const [moveDestinationFolders, setMoveDestinationFolders] = useState<S3Object[]>([]);

    // AI & Upload State
    const [uploadModalVisible, setUploadModalVisible] = useState(false);
    const [aiStudioVisible, setAIStudioVisible] = useState(false);
    const [aiSearchEnabled, setAiSearchEnabled] = useState(false);
    const [aiSearchResults, setAiSearchResults] = useState<string[]>([]);
    const [aiSearchLoading, setAiSearchLoading] = useState(false);

    // Detail Modal State
    const [detailModalVisible, setDetailModalVisible] = useState(false);
    const [detailModalFile, setDetailModalFile] = useState<MediaFile | null>(null);

    // System Bucket Lock State (Safety Mechanism)
    const [isSystemBucketLocked, setIsSystemBucketLocked] = useState(true);

    // Helper to check if operation is allowed
    const isOperationAllowed = (bucketName: string) => {
        if (bucketName === 'ns-system' && isSystemBucketLocked) return false;
        return true;
    };

    // Load initial data
    useEffect(() => {
        loadAllData();
    }, []);

    // Reload when bucket changes
    useEffect(() => {
        if (currentBucket) {
            loadMedia();
            loadStorageStats(currentBucket);
            fetchBucketVersioningStatus(currentBucket);
        }
    }, [currentBucket]);

    // Reload when path changes
    useEffect(() => {
        loadMedia();
    }, [currentPath]);

    // Load folders when move modal opens
    useEffect(() => {
        if (moveModalVisible) {
            const bucket = moveDestinationBucket || currentBucket;
            if (bucket) {
                loadMoveDestinationFolders(bucket);
            }
        }
    }, [moveModalVisible]);


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
            // Load files from DB to get metadata (Tags, Embeddings)
            // Backend `findAll` with folder returns all recursive files, so we filter for direct children here.
            const dbFiles = await mediaService.getMedia({
                bucket: currentBucket,
                folder: currentPath
            });

            // Filter for direct children only (simulate flat folder view)
            // Also ensure we handle potential missing s3_key by falling back to filename
            const directFiles = dbFiles.filter(f => {
                const key = f.s3_key || f.filename;
                // If currentPath is empty, key should not have slashes (root files)
                // If currentPath is "folder", key should start with "folder/" and have no more slashes

                const prefix = currentPath ? (currentPath.endsWith('/') ? currentPath : `${currentPath}/`) : '';

                if (!key.startsWith(prefix)) return false; // Should catch by backend query, but safety check

                const relativePath = key.slice(prefix.length);
                return !relativePath.includes('/');
            });

            setMedia(directFiles);
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

    // Load folders for move modal destination bucket
    const loadMoveDestinationFolders = async (bucketName: string) => {
        try {
            const folders = await mediaService.listFolders('', bucketName);
            setMoveDestinationFolders(folders);
        } catch (error) {
            console.warn(`Error loading folders for ${bucketName}:`, error);
            setMoveDestinationFolders([]);
        }
    };

    // Handle destination bucket change in move modal
    const handleMoveDestinationBucketChange = async (bucketName: string) => {
        setMoveDestinationBucket(bucketName);
        setMoveDestinationPath(""); // Reset path when bucket changes
        await loadMoveDestinationFolders(bucketName);
    };

    // Build unified tree with buckets as top-level, folders as children
    // Using useMemo ensures stable tree data that only rebuilds when buckets or folders change
    const folderTreeData = useMemo<DataNode[]>(() => {
        return buckets.map(bucket => {
            const bucketFolders = foldersByBucket[bucket.name];
            const hasFoldersLoaded = bucketFolders !== undefined;

            const isBucketLocked = bucket.name === 'ns-system' && isSystemBucketLocked;

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
                    {!isBucketLocked ? (
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
                    ) : (
                        <Tooltip title="System Bucket Protected">
                            <SafetyCertificateOutlined
                                style={{
                                    color: '#faad14',
                                    fontSize: 12,
                                    flexShrink: 0,
                                    cursor: 'not-allowed'
                                }}
                                onClick={(e) => e.stopPropagation()}
                            />
                        </Tooltip>
                    )}
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
                                {!(bucket.name === 'ns-system' && isSystemBucketLocked) ? (
                                    <Popconfirm
                                        title="Delete folder?"
                                        onConfirm={(e: any) => { e?.stopPropagation(); handleDeleteFolder(f.key); }}
                                        onCancel={(e: any) => e?.stopPropagation()}
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
                                            onClick={(e: any) => e.stopPropagation()}
                                        />
                                    </Popconfirm>
                                ) : (
                                    <Tooltip title="System Folder Protected">
                                        <SafetyCertificateOutlined
                                            style={{
                                                color: '#faad14',
                                                fontSize: 12,
                                                flexShrink: 0,
                                                marginLeft: 'auto',
                                                cursor: 'not-allowed'
                                            }}
                                            onClick={(e: any) => e.stopPropagation()}
                                        />
                                    </Tooltip>
                                )}
                            </div>
                        ),
                    };
                });
            }

            return baseNode;
        });
    }, [buckets, foldersByBucket, isSystemBucketLocked]);

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
            if (bucketList.length === 0) {
                // No buckets exist - clear selection
                setCurrentBucket("");
                return;
            }
            if (!currentBucket && bucketList.length > 0) {
                const defaultBucket = await mediaService.getDefaultBucket();
                // Only use default if it actually exists in the list
                const bucketExists = bucketList.some(b => b.name === defaultBucket);
                const initialBucket = bucketExists ? defaultBucket : bucketList[0].name;
                setCurrentBucket(initialBucket);
                // Auto-expand and load folders for initial bucket
                setExpandedTreeKeys([`bucket:${initialBucket}`]);
                loadFoldersForBucket(initialBucket);
            }
        } catch (error) {
            console.warn("Error loading buckets:", error);
        }
    };

    const loadStorageStats = async (bucket?: string) => {
        try {
            const stats = await mediaService.getStorageStats(bucket || currentBucket);
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
            await uploadWithConflictStrategy(file, progressInterval);
        } catch (error: any) {
            clearInterval(progressInterval);
            setUploading(false);
            setUploadProgress(0);
            message.error(`Upload failed: ${error.message}`);
        }
    };

    const uploadWithConflictStrategy = async (file: File, progressInterval: NodeJS.Timeout, strategy: 'RENAME' | 'OVERWRITE' | 'ERROR' = 'ERROR') => {
        try {
            // Use positional arguments: file, folder, bucket, altText, autoLabel, generateEmbedding, onConflict
            const uploadedFile = await mediaService.uploadMedia(
                file,
                currentPath || "",
                currentBucket || undefined,
                undefined, // altText
                false, // autoLabel
                false, // generateEmbedding
                strategy
            );

            clearInterval(progressInterval);
            setUploadProgress(100);

            if (uploadedFile) {
                setMedia(prev => [uploadedFile, ...prev]);
                message.success(`${file.name} uploaded successfully ${strategy !== 'ERROR' ? `(${strategy})` : ''}!`);
                loadStorageStats();
                loadMedia();
            } else {
                throw new Error("Upload failed (No response)");
            }
            setTimeout(() => {
                setUploading(false);
                setUploadProgress(0);
            }, 500);

        } catch (error: any) {
            // Check for Conflict Error
            const errorMessage = error.message || JSON.stringify(error);
            // GraphQL error structure might be nested
            const isConflict = errorMessage.includes("ConflictError") || errorMessage.includes("already exists");
            const isDuplicateContent = errorMessage.includes("Duplicate file detected");

            if (isConflict && !isDuplicateContent) {
                clearInterval(progressInterval);
                // Show Conflict Resolution Modal
                Modal.confirm({
                    title: 'File Already Exists',
                    content: (
                        <div>
                            <p>A file named <strong>{file.name}</strong> already exists in this folder.</p>
                            <p>What would you like to do?</p>
                        </div>
                    ),
                    okText: 'Rename (Keep Both)',
                    okType: 'primary',
                    cancelText: 'Overwrite (Replace)',
                    icon: <ExclamationCircleOutlined />,
                    width: 500,
                    footer: (_, { OkBtn, CancelBtn }) => (
                        <div style={{ textAlign: 'right', marginTop: '10px' }}>
                            <Button onClick={() => {
                                Modal.destroyAll(); // Close modal
                                // Restart upload with OVERWRITE
                                setUploading(true);
                                uploadWithConflictStrategy(file, progressInterval, 'OVERWRITE');
                            }} danger type="dashed" style={{ marginRight: 8 }}>
                                Overwrite (New Version)
                            </Button>
                            <Button onClick={() => {
                                Modal.destroyAll(); // Close modal
                                // Restart upload with RENAME
                                setUploading(true);
                                uploadWithConflictStrategy(file, progressInterval, 'RENAME');
                            }} type="primary">
                                Rename (Keep Both)
                            </Button>
                        </div>
                    ),
                });
            } else if (isDuplicateContent) {
                clearInterval(progressInterval);
                message.error("Duplicate content detected (Rejected). Identical file exists.");
                setUploading(false);
                setUploadProgress(0);
            } else {
                throw error; // Re-throw generic errors to outer catch
            }
        }
    }

    // Delete handler - uses ID for full media deletion (DB + S3 + cleanup)
    const handleDelete = async (id: string) => {
        // Find the file to check permissions
        const fileToDelete = media.find(m => m.id === id);
        if (!fileToDelete) {
            message.error("File not found");
            return;
        }

        // Security Guard
        // Check bucket_name (snake_case from mapToMediaFile)
        const bucket = fileToDelete.bucket_name || currentBucket;
        if (bucket === 'ns-system' && isSystemBucketLocked) {
            message.warning("System is locked. Unlock via settings to delete files.");
            return;
        }

        Modal.confirm({
            title: "Delete Media?",
            content: "This action cannot be undone. It will delete the file, database record, and all generated previews.",
            okText: "Delete",
            okType: "danger",
            onOk: async () => {
                // Use ID-based deletion to ensure full cleanup via Middleware
                const success = await mediaService.deleteMedia(id);
                if (success) {
                    setMedia(media.filter((m) => m.id !== id));
                    message.success("Media deleted");
                    loadStorageStats();
                    loadBuckets();
                    loadMedia(); // Refresh file list
                    refreshTree(); // Refresh explorer tree
                    setPreviewVisible(false);
                } else {
                    message.error("Failed to delete media");
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

    const handleMakeBucketPrivate = async () => {
        const success = await mediaService.deleteBucketPolicy(currentBucket);
        if (success) {
            message.success("Bucket is now private");
        } else {
            message.error("Failed to make bucket private");
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

        const srcBucket = currentBucket;
        const destBucket = moveDestinationBucket || currentBucket;
        const destPath = moveDestinationPath ?
            (moveDestinationPath.endsWith('/') ? moveDestinationPath : moveDestinationPath + '/') : '';
        const filename = selectedFileForMove.s3_key.split('/').pop() || selectedFileForMove.filename;
        const fullDestKey = `${destPath}${filename}`;

        // Pass bucket parameters for cross-bucket operations
        const success = isCopyMode
            ? await mediaService.copyFile(selectedFileForMove.s3_key, fullDestKey, srcBucket, destBucket)
            : await mediaService.moveFile(selectedFileForMove.s3_key, fullDestKey, srcBucket, destBucket);

        if (success) {
            message.success(`File ${isCopyMode ? "copied" : "moved"} successfully`);
            setMoveModalVisible(false);
            setMoveDestinationBucket("");
            setMoveDestinationPath("");
            setSelectedFileForMove(null);
            loadMedia();
            // Reload folders for destination bucket if different
            if (destBucket !== srcBucket) {
                loadFoldersForBucket(destBucket);
            }
        } else {
            message.error(`Failed to ${isCopyMode ? "copy" : "move"} file`);
        }
    }

    // Download file
    const handleDownload = (file: MediaFile) => {
        if (file.url) {
            // Create a temporary link to trigger download
            const link = document.createElement('a');
            link.href = file.url;
            link.download = file.filename || file.original_name || 'download';
            link.target = '_blank';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } else {
            message.warning("No download URL available");
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

    const getFileIcon = (mimeType?: string, filename?: string) => {
        const ext = filename?.split('.').pop()?.toLowerCase() || '';

        if (ext === 'xlsx' || ext === 'xls' || ext === 'csv' || mimeType?.includes("excel") || mimeType?.includes("spreadsheet") || mimeType?.includes("sheet")) return <FileExcelOutlined />;
        if (ext === 'docx' || ext === 'doc' || mimeType?.includes("word") || mimeType?.includes("wordprocessingml")) return <FileWordOutlined />;
        if (ext === 'pptx' || ext === 'ppt' || mimeType?.includes("presentation")) return <FilePptOutlined />;
        if (ext === 'pdf' || mimeType === "application/pdf") return <FilePdfOutlined />;

        if (!mimeType) return <FileUnknownOutlined />;
        if (mimeType.startsWith("image/")) return <FileImageOutlined />;
        if (mimeType.startsWith("video/")) return <VideoCameraOutlined />;
        if (mimeType.startsWith("audio/")) return <AudioOutlined />;
        if (mimeType.includes("zip") || mimeType.includes("compressed") || ext === 'zip' || ext === 'rar') return <FileZipOutlined />;
        if (mimeType.includes("text/")) return <FileTextOutlined />;
        return <FileOutlined />;
    };

    // Filter media based on search mode
    const filteredMedia = useMemo(() => {
        // AI search mode: filter by aiSearchResults IDs
        if (aiSearchEnabled && aiSearchResults.length > 0) {
            return media.filter(m => aiSearchResults.includes(m.id));
        }
        // Text search mode: filter by filename/alt_text
        if (searchQuery.trim()) {
            return media.filter(
                (m) =>
                    m.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    m.alt_text?.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }
        return media;
    }, [media, searchQuery, aiSearchEnabled, aiSearchResults]);

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
            ...(bucketVersioning[currentBucket] ? [
                { type: "divider" as const },
                { key: "versions", label: "Version History", icon: <HistoryOutlined />, onClick: () => handleViewVersionHistory(item) }
            ] : []),
            { key: "ai-embeddings", label: "Generate Embeddings", icon: <ExperimentOutlined />, onClick: () => handleGenerateEmbeddings(item) },
            { key: "auto-label", label: "Auto Label", icon: <ThunderboltOutlined />, onClick: () => handleAutoLabelMedia(item) },
            { key: "ai-label", label: "Label Studio", icon: <RobotOutlined />, onClick: () => handleSendToLabelStudio(item) },
            { type: "divider" as const },
            { key: "delete", label: "Delete", icon: <DeleteOutlined />, danger: true, disabled: !isOperationAllowed(currentBucket), onClick: () => handleDelete(item.id) },
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
                    (item.thumbnailUrl || item.mime_type?.startsWith("image/")) ? (
                        <div style={{ height: 194, overflow: "hidden", background: "#f0f0f0", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: '8px 8px 0 0' }}>
                            <Image
                                src={item.thumbnailUrl || item.url}
                                alt={item.alt_text || item.filename}
                                style={{ objectFit: "cover", width: "100%", height: 194 }}
                                preview={false}
                                fallback="/assets/file-icons/error.svg" // Optional fallback
                                onClick={() => { setSelectedMedia(item); setPreviewVisible(true); }}
                            />
                        </div>
                    ) : (
                        <div
                            className="bg-gradient-to-br from-slate-100 to-slate-200"
                            style={{
                                height: 194,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 64,
                                color: "#64748b",
                                borderRadius: '8px 8px 0 0'
                            }}
                            onClick={() => { setSelectedMedia(item); setPreviewVisible(true); }}
                        >
                            {getFileIcon(item.mime_type, item.filename)}
                        </div>
                    )
                }
                actions={[
                    <AnimatedTooltip key="preview" content="Preview" position="bottom">
                        <EyeOutlined onClick={() => { setSelectedMedia(item); setPreviewVisible(true); }} />
                    </AnimatedTooltip>,
                    <AnimatedTooltip key="info" content="Details" position="bottom">
                        <InfoCircleOutlined onClick={() => { setDetailModalFile(item); setDetailModalVisible(true); }} />
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

    // State for forcing tree refresh
    const [treeRefreshTrigger, setTreeRefreshTrigger] = useState(0);

    const refreshTree = () => {
        setTreeRefreshTrigger(prev => prev + 1);
        loadAllData(); // Keep loading stats/media
    };

    const handleCreateBucket = async () => {
        if (!newBucketName.trim()) return;
        const success = await mediaService.createBucket(newBucketName);
        if (success) {
            message.success("Bucket created");
            setNewBucketModalVisible(false);
            setNewBucketName("");
            refreshTree(); // Refresh tree
        } else {
            message.error("Failed to create bucket");
        }
    };

    const handleCreateFolder = async () => {
        if (!newFolderName.trim() || !currentBucket) return;
        // Ensure path ends with slash
        const path = newFolderName.endsWith('/') ? newFolderName : `${newFolderName}/`;
        // If currentPath is set, append to it
        const fullPath = currentPath ? `${currentPath}${path}` : path;

        const success = await mediaService.createFolder(fullPath, currentBucket);
        if (success) {
            message.success("Folder created");
            setNewFolderModalVisible(false);
            setNewFolderName("");
            refreshTree(); // Refresh tree
        } else {
            message.error("Failed to create folder");
        }
    };

    const handleDeleteBucket = async (bucket: string) => {

        // Security Guard
        if (bucket === 'ns-system' && isSystemBucketLocked) {
            message.warning("System is locked. Unlock via settings to delete this bucket.");
            return;
        }

        const success = await mediaService.deleteBucket(bucket);
        if (success) {
            message.success("Bucket deleted");
            refreshTree(); // Refresh tree
            if (currentBucket === bucket) {
                setCurrentBucket("");
                setCurrentPath("");
            }
        } else {
            message.error("Failed to delete bucket");
        }
    };



    const handleDeleteFolder = async (path: string, bucketName?: string) => {
        const targetBucket = bucketName || currentBucket;
        console.log('[DeleteFolder] called with path:', path, 'bucketName:', bucketName, 'currentBucket:', currentBucket, 'targetBucket:', targetBucket);

        // Security Guard
        if (targetBucket === 'ns-system' && isSystemBucketLocked) {
            console.log('[DeleteFolder] BLOCKED: System bucket locked');
            message.warning("System is locked. Unlock via settings to delete folders.");
            return;
        }

        try {
            console.log('[DeleteFolder] Calling mediaService.deleteFolder...');
            const success = await mediaService.deleteFolder(path, targetBucket);
            console.log('[DeleteFolder] Result:', success);
            if (success) {
                message.success("Folder deleted");
                refreshTree();
                if (currentPath === path) {
                    setCurrentPath("");
                }
            } else {
                message.error("Failed to delete folder");
            }
        } catch (err) {
            console.error('[DeleteFolder] Error:', err);
            message.error("Error deleting folder");
        }
    };

    return (
        <CMSLayout
            title={<AuroraText colors={["#9333ea", "#7c3aed", "#6366f1", "#00ffff", "#ff00ff"]}>Media Library</AuroraText>}
            subTitle={
                <DecryptedText
                    text="Manage your media files and folders"
                    animateOn="view"
                    revealDirection="center"
                    speed={50}
                    maxIterations={15}
                    sequential={true}
                />
            }
        >
            {/* Content Wrapper */}
            <div className="relative" style={{ zIndex: 1 }}>
                <div style={{ display: 'flex', gap: 16, minHeight: 600, alignItems: 'stretch' }}>
                    {showExplorer && (
                        <div style={{ width: 280, minWidth: 280, display: 'flex', flexDirection: 'column' }}>
                            <div style={{ position: 'sticky', top: 16 }}>
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
                                                    onClick={() => folderTreeRef.current?.expandAll()}
                                                    size="small"
                                                    className="text-gray-400 hover:text-violet-500 flex items-center justify-center w-7 h-7"
                                                />
                                            </AnimatedTooltip>
                                            <AnimatedTooltip content="Collapse All">
                                                <Button
                                                    type="text"
                                                    icon={<CompressOutlined style={{ fontSize: 14 }} />}
                                                    onClick={() => folderTreeRef.current?.collapseAll()}
                                                    size="small"
                                                    className="text-gray-400 hover:text-violet-500 flex items-center justify-center w-7 h-7"
                                                />
                                            </AnimatedTooltip>

                                            <div className="w-[1px] h-3 bg-gray-200 dark:bg-gray-700 mx-1" />

                                            <AnimatedTooltip content="New Folder">
                                                <Button
                                                    type="text"
                                                    icon={<FolderAddOutlined style={{ fontSize: 14 }} />}
                                                    onClick={() => setNewFolderModalVisible(true)}
                                                    size="small"
                                                    className="text-gray-400 hover:text-violet-500 flex items-center justify-center w-7 h-7"
                                                />
                                            </AnimatedTooltip>
                                            <AnimatedTooltip content="New Bucket">
                                                <Button
                                                    type="text"
                                                    icon={<PlusOutlined style={{ fontSize: 14 }} />}
                                                    onClick={() => setNewBucketModalVisible(true)}
                                                    size="small"
                                                    className="text-gray-400 hover:text-violet-500 flex items-center justify-center w-7 h-7"
                                                />
                                            </AnimatedTooltip>
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
                                        border: 'none'
                                    }}
                                    className="dark:!bg-transparent dark:!border-none"
                                    styles={{
                                        header: {
                                            background: 'transparent',
                                            borderBottom: '1px solid rgba(139, 92, 246, 0.2)',
                                            minHeight: 40,
                                            padding: '0 12px'
                                        },
                                        body: {
                                            padding: '8px 0',
                                            flex: 1,
                                            overflow: 'auto'
                                        }
                                    }}
                                >
                                    <div className="px-3 mb-4 flex items-center gap-2">
                                        <Input
                                            placeholder="Search tree..."
                                            prefix={<SearchOutlined style={{ color: '#8b5cf6', fontSize: 13 }} />}
                                            size="small"
                                            className="flex-1 rounded-md border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 h-8 hover:bg-white dark:hover:bg-gray-800 focus:bg-white dark:focus:bg-gray-800 transition-all text-xs"
                                            allowClear
                                        />
                                        <AnimatedTooltip content="Refresh Tree">
                                            <Button
                                                type="text"
                                                icon={<ReloadOutlined style={{ fontSize: 13 }} />}
                                                onClick={loadAllData} // Original handler
                                                size="small"
                                                className="text-gray-400 hover:text-violet-500"
                                            />
                                        </AnimatedTooltip>
                                    </div>

                                    <div className="px-1 custom-scrollbar overflow-x-hidden overflow-y-auto" style={{ maxHeight: 'calc(100vh - 280px)' }}>
                                        <FolderTree
                                            ref={folderTreeRef}
                                            currentBucket={currentBucket}
                                            currentPath={currentPath}
                                            onSelect={(bucket, path) => {
                                                setCurrentBucket(bucket);
                                                setCurrentPath(path);
                                            }}
                                            onRefresh={loadAllData}
                                            refreshTrigger={treeRefreshTrigger}
                                            className="[&_.ant-tree-treenode]:py-0.5 [&_.ant-tree-title]:text-xs [&_.ant-tree-switcher]:w-4"
                                            onDeleteBucket={(name) => handleDeleteBucket(name)}
                                            onDeleteFolder={(path, bucket) => handleDeleteFolder(path, bucket)}
                                            onBucketSettings={(name) => {
                                                setCurrentBucket(name);
                                                loadLifecycleRules();
                                                fetchBucketVersioningStatus(name);
                                                setBucketSettingsDrawerVisible(true);
                                            }}
                                            isSystemBucketLocked={isSystemBucketLocked}
                                        />
                                    </div>
                                </Card>
                            </div>
                        </div>
                    )}

                    {/* Main Content */}
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                        <div className="flex flex-col gap-4 h-full">
                            {/* Header Card */}
                            <Card
                                size="small"
                                style={glassCardStyle}
                                className="dark:!bg-[rgba(15,15,23,0.6)] dark:!border-purple-500/20 shadow-sm"
                                styles={{ header: glassHeaderStyle }}
                                title={
                                    <div className="flex items-center gap-3">
                                        <Button
                                            type="text"
                                            size="small"
                                            icon={showExplorer ? <MenuFoldOutlined /> : <MenuUnfoldOutlined />}
                                            onClick={() => setShowExplorer(!showExplorer)}
                                            className="text-gray-500 hover:text-violet-600"
                                        />
                                        <span style={{
                                            background: 'linear-gradient(to right, #8b5cf6, #6366f1)',
                                            WebkitBackgroundClip: 'text',
                                            WebkitTextFillColor: 'transparent',
                                            fontWeight: 600,
                                            fontSize: '14px'
                                        }}>
                                            {currentPath ? currentPath.split('/').filter(Boolean).pop() : currentBucket || 'Media Files'}
                                        </span>
                                    </div>
                                }
                                extra={
                                    <Space size={8}>
                                        <Tag icon={<CloudServerOutlined />} color="purple" bordered={false} className="px-2 py-0.5 text-[11px] bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400 rounded-md m-0">
                                            {currentBucket || 'S3'}
                                        </Tag>

                                        <Input
                                            prefix={<SearchOutlined style={{ color: '#8b5cf6' }} />}
                                            placeholder="Search files..."
                                            value={searchQuery}
                                            onChange={e => setSearchQuery(e.target.value)}
                                            onPressEnter={async () => {
                                                if (aiSearchEnabled && searchQuery.trim()) {
                                                    setAiSearchLoading(true);
                                                    try {
                                                        const results = await mediaService.semanticSearch(searchQuery, 20);
                                                        setAiSearchResults(results.map(r => r.id));
                                                        message.success(`Found ${results.length} matching files`);
                                                    } catch (e) {
                                                        message.error('AI search failed');
                                                    } finally {
                                                        setAiSearchLoading(false);
                                                    }
                                                }
                                            }}
                                            className="w-32 md:w-48 !bg-transparent border-b !border-0 focus:border-b-violet-500 transition-colors text-xs"
                                            bordered={false}
                                            size="small"
                                            suffix={aiSearchLoading ? <LoadingOutlined spin /> : null}
                                        />

                                        <Tooltip title={aiSearchEnabled ? "AI search enabled" : "Enable AI search"}>
                                            <Switch
                                                checked={aiSearchEnabled}
                                                onChange={(checked) => {
                                                    setAiSearchEnabled(checked);
                                                    if (!checked) setAiSearchResults([]);
                                                }}
                                                checkedChildren={<RobotOutlined />}
                                                unCheckedChildren={<SearchOutlined />}
                                                size="small"
                                            />
                                        </Tooltip>

                                        <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-1" />

                                        {/* View Mode */}
                                        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5" style={{ border: '1px solid rgba(0,0,0,0.05)' }}>
                                            <AnimatedTooltip content="Grid View">
                                                <Button
                                                    type="text"
                                                    size="small"
                                                    icon={<AppstoreOutlined style={{ fontSize: 12 }} />}
                                                    className={viewMode === 'grid' ? 'bg-white dark:bg-gray-700 shadow-sm text-violet-600' : 'text-gray-400 hover:text-violet-400'}
                                                    onClick={() => setViewMode('grid')}
                                                    style={{ width: 24, height: 24, minWidth: 24 }}
                                                />
                                            </AnimatedTooltip>
                                            <AnimatedTooltip content="List View">
                                                <Button
                                                    type="text"
                                                    size="small"
                                                    icon={<UnorderedListOutlined style={{ fontSize: 12 }} />}
                                                    className={viewMode === 'list' ? 'bg-white dark:bg-gray-700 shadow-sm text-violet-600' : 'text-gray-400 hover:text-violet-400'}
                                                    onClick={() => setViewMode('list')}
                                                    style={{ width: 24, height: 24, minWidth: 24 }}
                                                />
                                            </AnimatedTooltip>
                                            <AnimatedTooltip content="Detail View">
                                                <Button
                                                    type="text"
                                                    size="small"
                                                    icon={<BarsOutlined style={{ fontSize: 12 }} />}
                                                    className={viewMode === 'detail' ? 'bg-white dark:bg-gray-700 shadow-sm text-violet-600' : 'text-gray-400 hover:text-violet-400'}
                                                    onClick={() => setViewMode('detail')}
                                                    style={{ width: 24, height: 24, minWidth: 24 }}
                                                />
                                            </AnimatedTooltip>
                                        </div>

                                        <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-1" />

                                        {/* Refresh */}
                                        <Tooltip title="Refresh">
                                            <Button type="text" size="small" icon={<ReloadOutlined style={{ fontSize: 13 }} />} onClick={loadAllData} className="text-gray-400 hover:text-violet-500" />
                                        </Tooltip>

                                        {/* Upload */}
                                        <MagicButton
                                            icon={<UploadOutlined style={{ fontSize: 10 }} />}
                                            onClick={() => (currentBucket && buckets.length > 0) && setUploadModalVisible(true)}
                                            disabled={!currentBucket || buckets.length === 0 || !isOperationAllowed(currentBucket)}
                                            size="small"
                                        >
                                            Upload
                                        </MagicButton>
                                    </Space>
                                }
                            >
                                <div className="flex items-center justify-between w-full">
                                    <Breadcrumb
                                        className="text-xs"
                                        items={[
                                            { title: <><HomeOutlined className="mr-1" /> Media</> },
                                            ...currentPath.split('/').filter(Boolean).map((p, i) => ({
                                                title: p,
                                            })),
                                        ]}
                                        separator={<span className="text-gray-300 text-[10px] mx-1">/</span>}
                                    />
                                    {currentPath && (
                                        isOperationAllowed(currentBucket) ? (
                                            <Popconfirm
                                                title="Delete this folder?"
                                                onConfirm={() => handleDeleteFolder(currentPath)}
                                                okText="Delete"
                                                cancelText="Cancel"
                                            >
                                                <Button size="small" type="text" danger icon={<DeleteOutlined />} className="text-[10px]">Delete Folder</Button>
                                            </Popconfirm>
                                        ) : (
                                            <Tag color="error" icon={<SafetyCertificateOutlined />} className="text-[10px] m-0">System Locked</Tag>
                                        )
                                    )}
                                </div>
                            </Card>

                            {/* Stats Card */}
                            {storageStats && (
                                <Card
                                    size="small"
                                    style={glassCardStyle}
                                    className="dark:!bg-[rgba(15,15,23,0.6)] dark:!border-purple-500/20 shadow-sm transition-all hover:shadow-md"
                                    bodyStyle={{ padding: '10px 16px' }}
                                >
                                    <Row gutter={32} align="middle" justify="start">
                                        <Col>
                                            <Statistic
                                                title={<span className="text-[10px] text-gray-500 uppercase tracking-wider">Files</span>}
                                                value={storageStats.totalFiles}
                                                valueStyle={{ color: '#8b5cf6', fontWeight: 600, fontSize: 16 }}
                                                suffix={<span className="text-xs text-gray-400">items</span>}
                                            />
                                        </Col>
                                        <Col>
                                            <div className="h-8 w-px bg-gray-100 dark:bg-gray-800 mx-2" />
                                        </Col>
                                        <Col>
                                            <Statistic
                                                title={<span className="text-[10px] text-gray-500 uppercase tracking-wider">Storage</span>}
                                                value={formatFileSize(storageStats.totalSizeBytes).split(' ')[0]}
                                                suffix={<span className="text-xs text-gray-400">{formatFileSize(storageStats.totalSizeBytes).split(' ')[1]}</span>}
                                                valueStyle={{ color: '#6366f1', fontWeight: 600, fontSize: 16 }}
                                            />
                                        </Col>
                                        <Col>
                                            <div className="h-8 w-px bg-gray-100 dark:bg-gray-800 mx-2" />
                                        </Col>
                                        <Col>
                                            <Statistic
                                                title={<span className="text-[10px] text-gray-500 uppercase tracking-wider">Status</span>}
                                                value={`Live (${currentBucket})`}
                                                valueStyle={{ color: '#4d7c0f', fontWeight: 600, fontSize: 14 }}
                                            />
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
                                            onClick={() => (currentBucket && buckets.length > 0) && setUploadModalVisible(true)}
                                            disabled={!currentBucket || buckets.length === 0}
                                            className={(!currentBucket || buckets.length === 0) ? "opacity-50 cursor-not-allowed" : ""}
                                        >
                                            {buckets.length === 0 ? "Create a Bucket First" : "Upload First File"}
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
                                                            {getFileIcon(item.mime_type, item.filename)}
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
                                                        {getFileIcon(record.mime_type, record.filename)}
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
                                            title: 'Description',
                                            dataIndex: 'metadata',
                                            key: 'description',
                                            width: 200,
                                            ellipsis: true,
                                            render: (metadata: any) => <Text className="text-xs text-gray-500">{metadata?.description || '-'}</Text>,
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
                        </div>
                    </div>
                </div>
            </div>

            {/* Preview Modal */}
            <MediaPreviewModal
                visible={previewVisible}
                mediaFile={selectedMedia}
                mode="preview"
                onClose={() => setPreviewVisible(false)}
                isPublicBucket={buckets.find(b => b.name === selectedMedia?.bucket_name)?.isPublic}
                onUpdate={loadMedia}
            />

            {/* New Folder Modal */}
            <Modal
                title={
                    <div className="flex items-center gap-2">
                        <FolderAddOutlined className="text-violet-500" />
                        <span>Create New Folder</span>
                    </div>
                }
                open={newFolderModalVisible}
                onOk={handleCreateFolder}
                onCancel={() => {
                    setNewFolderModalVisible(false);
                    setNewFolderName("");
                }}
                okText="Create Folder"
                okButtonProps={{
                    style: {
                        background: 'linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)',
                        borderColor: 'transparent'
                    }
                }}
            >
                <div className="py-2">
                    <Text type="secondary" className="text-xs uppercase tracking-wide mb-2 block">
                        Folder Name
                    </Text>
                    <Input
                        placeholder="Enter folder name"
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                        prefix={<FolderOutlined className="text-yellow-500" />}
                        size="large"
                    />
                    <Text type="secondary" className="text-xs mt-2 block">
                        Will be created in: {currentBucket}/{currentPath || "(root)"}
                    </Text>
                </div>
            </Modal>

            {/* New Bucket Modal */}
            <Modal
                title={
                    <div className="flex items-center gap-2">
                        <DatabaseOutlined className="text-violet-500" />
                        <span>Create New Bucket</span>
                    </div>
                }
                open={newBucketModalVisible}
                onOk={handleCreateBucket}
                onCancel={() => {
                    setNewBucketModalVisible(false);
                    setNewBucketName("");
                }}
                okText="Create Bucket"
                okButtonProps={{
                    style: {
                        background: 'linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)',
                        borderColor: 'transparent'
                    }
                }}
            >
                <div className="py-2">
                    <Text type="secondary" className="text-xs uppercase tracking-wide mb-2 block">
                        Bucket Name
                    </Text>
                    <Input
                        placeholder="my-bucket-name"
                        value={newBucketName}
                        onChange={(e) => setNewBucketName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                        prefix={<DatabaseOutlined className="text-blue-500" />}
                        size="large"
                    />
                    <Text type="secondary" className="text-xs mt-2 block">
                        Bucket names must be lowercase, and can only contain letters, numbers, and hyphens.
                    </Text>
                </div>
            </Modal>

            {/* Move/Copy Modal */}
            <Modal
                title={
                    <div className="flex items-center gap-2">
                        {isCopyMode ? <ScissorOutlined /> : <SwapOutlined />}
                        <span>{isCopyMode ? "Copy" : "Move"} to Different Location</span>
                    </div>
                }
                open={moveModalVisible}
                onOk={handleMoveFile}
                onCancel={() => {
                    setMoveModalVisible(false);
                    setMoveDestinationBucket("");
                    setMoveDestinationPath("");
                    setSelectedFileForMove(null);
                }}
                okText={isCopyMode ? "Copy" : "Move"}
                okButtonProps={{
                    style: {
                        background: 'linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)',
                        borderColor: 'transparent'
                    }
                }}
                width={500}
            >
                <div className="flex flex-col gap-4 py-2">
                    {/* File Info */}
                    <div className="p-3 rounded-lg bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-900/20 dark:to-indigo-900/20">
                        <Text type="secondary" className="text-xs uppercase tracking-wide">Selected File</Text>
                        <div className="flex items-center gap-2 mt-1">
                            <FileOutlined className="text-violet-500" />
                            <Text strong>{selectedFileForMove?.filename}</Text>
                        </div>
                        {selectedFileForMove?.s3_key && (
                            <Text type="secondary" className="text-xs mt-1 block">
                                Current: {currentBucket}/{selectedFileForMove.s3_key}
                            </Text>
                        )}
                    </div>

                    <Divider style={{ margin: '4px 0' }} />

                    {/* Destination Bucket */}
                    <div>
                        <Text type="secondary" className="text-xs uppercase tracking-wide mb-1 block">
                            <DatabaseOutlined className="mr-1" />
                            Destination Bucket
                        </Text>
                        <Select
                            value={moveDestinationBucket || currentBucket}
                            onChange={handleMoveDestinationBucketChange}
                            style={{ width: '100%' }}
                            options={buckets.map(b => ({
                                value: b.name,
                                label: (
                                    <div className="flex items-center gap-2">
                                        <DatabaseOutlined />
                                        <span>{b.name}</span>
                                        {b.name === currentBucket && (
                                            <Tag color="blue" style={{ fontSize: 10 }}>Current</Tag>
                                        )}
                                    </div>
                                )
                            }))}
                        />
                    </div>

                    {/* Destination Folder */}
                    <div>
                        <Text type="secondary" className="text-xs uppercase tracking-wide mb-1 block">
                            <FolderOutlined className="mr-1" />
                            Destination Folder
                        </Text>
                        <Select
                            value={moveDestinationPath}
                            onChange={setMoveDestinationPath}
                            style={{ width: '100%' }}
                            placeholder="Select folder (leave empty for root)"
                            allowClear
                            showSearch
                            filterOption={(input, option) =>
                                String(option?.value || '')?.toLowerCase().includes(input.toLowerCase())
                            }
                            options={[
                                {
                                    value: "",
                                    label: (
                                        <div className="flex items-center gap-2">
                                            <HomeOutlined />
                                            <span className="text-gray-500">(Root)</span>
                                        </div>
                                    )
                                },
                                ...moveDestinationFolders.map(folder => {
                                    const folderName = folder.key.replace(/\/$/, "");
                                    return {
                                        value: folder.key,
                                        label: (
                                            <div className="flex items-center gap-2">
                                                <FolderOutlined className="text-yellow-500" />
                                                <span>{folderName}</span>
                                            </div>
                                        )
                                    };
                                })
                            ]}
                        />
                        <Text type="secondary" className="text-xs mt-1 block">
                            {moveDestinationFolders.length === 0
                                ? "No folders in this bucket. Files will be placed in root."
                                : `${moveDestinationFolders.length} folder(s) available`}
                        </Text>
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
                isSystemLocked={isSystemBucketLocked}
                onToggleLock={(locked) => setIsSystemBucketLocked(locked)}
                onToggleVersioning={() => fetchBucketVersioningStatus(currentBucket)}
                storageStats={storageStats}
                onDeleteBucket={handleDeleteBucket}
                onMakePublic={handleMakeBucketPublic}
                onDeletePolicy={handleMakeBucketPrivate}
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

            {/* New Modals & Drawers */}
            <UploadModal
                visible={uploadModalVisible}
                onClose={() => setUploadModalVisible(false)}
                onUploadSuccess={() => { loadAllData(); }}
                currentFolder={currentPath}
                bucket={currentBucket}
                buckets={buckets}
            />



            <AIStudioDrawer
                visible={aiStudioVisible}
                onClose={() => setAIStudioVisible(false)}
            />

            {/* Media Detail Modal */}
            <MediaPreviewModal
                visible={detailModalVisible}
                mediaFile={detailModalFile}
                mode="detail"
                onClose={() => { setDetailModalVisible(false); setDetailModalFile(null); }}
                isPublicBucket={buckets.find(b => b.name === detailModalFile?.bucket_name)?.isPublic}
                onUpdate={loadMedia}
            />

        </CMSLayout >
    );
}
