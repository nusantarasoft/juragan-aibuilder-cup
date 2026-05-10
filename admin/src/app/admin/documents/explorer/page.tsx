'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import CMSLayout from '@/components/layout/CMSLayout';
import { Card, Table, Typography, Button, Space, Tag, Spin, Empty, Row, Col, Modal, Form, Input, Select, Breadcrumb, Dropdown, message, Tooltip, Upload, Badge, Popconfirm } from 'antd';
import { FolderOutlined, FileOutlined, PlusOutlined, UploadOutlined, DeleteOutlined, EditOutlined, DownloadOutlined, EyeOutlined, FolderAddOutlined, ArrowLeftOutlined, FileExcelOutlined, FilePdfOutlined, FileImageOutlined, FileWordOutlined, FileZipOutlined, FileUnknownOutlined, LockOutlined, ShareAltOutlined, HomeOutlined, ReloadOutlined } from '@ant-design/icons';
import { documentService, DocFolder, DocFile } from '@/lib/documentService';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import dayjs from 'dayjs';

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

const fileIcon = (mime?: string) => {
    if (!mime) return <FileUnknownOutlined style={{ color: '#6b7280' }} />;
    if (mime.includes('image')) return <FileImageOutlined style={{ color: '#10b981' }} />;
    if (mime.includes('pdf')) return <FilePdfOutlined style={{ color: '#ef4444' }} />;
    if (mime.includes('spreadsheet') || mime.includes('excel')) return <FileExcelOutlined style={{ color: '#10b981' }} />;
    if (mime.includes('word') || mime.includes('document')) return <FileWordOutlined style={{ color: '#3b82f6' }} />;
    if (mime.includes('zip') || mime.includes('archive')) return <FileZipOutlined style={{ color: '#f59e0b' }} />;
    return <FileOutlined style={{ color: '#6366f1' }} />;
};
const fmtSize = (b: number) => { if (b >= 1e9) return `${(b/1e9).toFixed(1)} GB`; if (b >= 1e6) return `${(b/1e6).toFixed(1)} MB`; if (b >= 1e3) return `${(b/1e3).toFixed(1)} KB`; return `${b} B`; };

export default function FileExplorerPage() {
    const { themeColor } = usePreferencesStore();
    const [loading, setLoading] = useState(true);
    const [folders, setFolders] = useState<DocFolder[]>([]);
    const [files, setFiles] = useState<DocFile[]>([]);
    const [currentFolder, setCurrentFolder] = useState<string | undefined>(undefined);
    const [breadcrumbs, setBreadcrumbs] = useState<{ id?: string; name: string }[]>([{ name: 'Root' }]);
    const [folderModal, setFolderModal] = useState(false);
    const [previewFile, setPreviewFile] = useState<DocFile | null>(null);
    const [form] = Form.useForm();
    const [msgApi, ctxHolder] = message.useMessage();

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [f, fi] = await Promise.all([
                documentService.getFolders(undefined, currentFolder),
                documentService.getFiles(undefined, { folderId: currentFolder }),
            ]);
            setFolders(f); setFiles(fi);
        } catch {} finally { setLoading(false); }
    }, [currentFolder]);
    useEffect(() => { load(); }, [load]);

    const openFolder = (folder: DocFolder) => {
        setCurrentFolder(folder.id);
        setBreadcrumbs(prev => [...prev, { id: folder.id, name: folder.name }]);
    };
    const goToBreadcrumb = (index: number) => {
        const bc = breadcrumbs.slice(0, index + 1);
        setBreadcrumbs(bc);
        setCurrentFolder(bc[bc.length - 1].id);
    };
    const goUp = () => { if (breadcrumbs.length > 1) goToBreadcrumb(breadcrumbs.length - 2); };

    const createFolder = async () => {
        try {
            const vals = await form.validateFields();
            await documentService.createFolder(undefined, { ...vals, parentId: currentFolder });
            msgApi.success('Folder created');
            setFolderModal(false); form.resetFields(); load();
        } catch (e: any) { if (e.message) msgApi.error(e.message); }
    };
    const deleteFolder = async (id: string) => { try { await documentService.deleteFolder(id); msgApi.success('Deleted'); load(); } catch { msgApi.error('Failed'); } };
    const deleteFile = async (id: string) => { try { await documentService.deleteFile(id); msgApi.success('Deleted'); load(); } catch { msgApi.error('Failed'); } };

    const combined = [
        ...folders.map(f => ({ key: `f-${f.id}`, isFolder: true, id: f.id, name: f.name, mimeType: 'folder', sizeBytes: 0, updatedAt: f.createdAt, createdBy: f.createdBy, color: f.color, childCount: f.childCount, fileCount: f.fileCount, status: 'active', tags: [] as string[], currentVersion: 0 })),
        ...files.map(f => ({ key: `d-${f.id}`, isFolder: false, id: f.id, name: f.name, mimeType: f.mimeType || '', sizeBytes: f.sizeBytes, updatedAt: f.updatedAt, createdBy: f.createdBy, color: undefined as string | undefined, childCount: 0, fileCount: 0, status: f.status, tags: f.tags, currentVersion: f.currentVersion })),
    ];

    const columns = [
        {
            title: 'Name', key: 'name', ellipsis: true,
            render: (_: any, r: typeof combined[0]) => (
                <Space>
                    {r.isFolder ? <FolderOutlined style={{ color: r.color || themeColor, fontSize: 16 }} /> : fileIcon(r.mimeType)}
                    <Text strong={r.isFolder} style={{ cursor: r.isFolder ? 'pointer' : undefined }} onClick={() => r.isFolder && openFolder(r as any)}>{r.name}</Text>
                    {r.currentVersion > 1 && <Tag style={{ fontSize: 10, padding: '0 4px' }}>v{r.currentVersion}</Tag>}
                </Space>
            ),
            sorter: (a: typeof combined[0], b: typeof combined[0]) => (a.isFolder === b.isFolder ? a.name.localeCompare(b.name) : a.isFolder ? -1 : 1),
            defaultSortOrder: 'ascend' as const,
        },
        { title: 'Type', key: 'type', width: 100, render: (_: any, r: typeof combined[0]) => r.isFolder ? <Tag color="blue">Folder</Tag> : <Tag>{(r.mimeType || '').split('/').pop()}</Tag> },
        { title: 'Size', key: 'size', width: 100, render: (_: any, r: typeof combined[0]) => r.isFolder ? `${r.fileCount || 0} files` : fmtSize(r.sizeBytes) },
        { title: 'Modified', key: 'mod', width: 140, render: (_: any, r: typeof combined[0]) => r.updatedAt ? dayjs(r.updatedAt).format('DD MMM YYYY HH:mm') : '—' },
        { title: 'Owner', dataIndex: 'createdBy', key: 'owner', width: 100, render: (v: string) => v || '—' },
        {
            title: '', key: 'actions', width: 80,
            render: (_: any, r: typeof combined[0]) => (
                <Space size={4}>
                    {!r.isFolder && <Tooltip title="Preview"><Button size="small" type="text" icon={<EyeOutlined />} onClick={() => setPreviewFile(r as any)} /></Tooltip>}
                    <Popconfirm title="Delete?" onConfirm={() => r.isFolder ? deleteFolder(r.id) : deleteFile(r.id)}>
                        <Button size="small" type="text" icon={<DeleteOutlined />} danger />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <CMSLayout title={<AuroraText colors={[themeColor, "var(--theme-secondary, #6366f1)", "var(--theme-accent, #a78bfa)"]}>File Explorer</AuroraText>}
            subTitle={<DecryptedText text="Browse, upload & manage documents" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}>
            {ctxHolder}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35 }} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

                {/* Toolbar */}
                <Card style={glass} size="small">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                        <Space>
                            {breadcrumbs.length > 1 && <Button icon={<ArrowLeftOutlined />} size="small" onClick={goUp} />}
                            <Breadcrumb items={breadcrumbs.map((bc, i) => ({
                                title: i === 0 ? <HomeOutlined /> : bc.name,
                                onClick: i < breadcrumbs.length - 1 ? () => goToBreadcrumb(i) : undefined,
                                className: i < breadcrumbs.length - 1 ? 'cursor-pointer' : '',
                            }))} />
                        </Space>
                        <Space>
                            <Button icon={<ReloadOutlined />} size="small" onClick={load} />
                            <Button icon={<FolderAddOutlined />} onClick={() => { form.resetFields(); setFolderModal(true); }}>New Folder</Button>
                            <Upload showUploadList={false} multiple beforeUpload={() => false} onChange={info => { if (info.file) { msgApi.success(`${info.file.name} queued for upload`); } }}>
                                <Button type="primary" icon={<UploadOutlined />} style={{ borderRadius: 8, background: `linear-gradient(135deg, ${themeColor}, ${themeColor}dd)` }}>Upload</Button>
                            </Upload>
                        </Space>
                    </div>
                </Card>

                {/* Stats Row */}
                <Row gutter={[10, 10]}>
                    {[
                        { t: 'Folders', v: folders.length, c: '#6366f1', icon: <FolderOutlined /> },
                        { t: 'Files', v: files.length, c: '#10b981', icon: <FileOutlined /> },
                        { t: 'Total Size', v: fmtSize(files.reduce((s, f) => s + f.sizeBytes, 0)), c: '#3b82f6', icon: <FileOutlined /> },
                    ].map((s, i) => (
                        <Col key={i} xs={8}><motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                            <Card size="small" style={{ ...glass, textAlign: 'center', borderTop: `2px solid ${s.c}` }}>
                                <div style={{ color: s.c, fontSize: 14, marginBottom: 2 }}>{s.icon}</div>
                                <Text strong style={{ fontSize: 16, color: s.c, display: 'block' }}>{s.v}</Text>
                                <Text type="secondary" style={{ fontSize: 10 }}>{s.t}</Text>
                            </Card>
                        </motion.div></Col>
                    ))}
                </Row>

                {/* File Table */}
                <Card style={glass}>
                    {loading ? <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div> :
                        combined.length === 0 ? <Empty description="This folder is empty." /> :
                        <Table scroll={{ x: 800 }} dataSource={combined} columns={columns} size="small" pagination={{ pageSize: 30, showTotal: t => `${t} items` }} />
                    }
                </Card>
            </motion.div>

            <Modal title="New Folder" open={folderModal} onOk={createFolder} onCancel={() => setFolderModal(false)} okText="Create">
                <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
                    <Form.Item name="name" label="Folder Name" rules={[{ required: true }]}><Input placeholder="Project Documents" /></Form.Item>
                    <Form.Item name="color" label="Color" initialValue="#6366f1"><Input type="color" style={{ width: 60, height: 32 }} /></Form.Item>
                    <Form.Item name="description" label="Description"><Input.TextArea rows={2} /></Form.Item>
                </Form>
            </Modal>

            <Modal title="File Preview" open={!!previewFile} onCancel={() => setPreviewFile(null)} footer={null} width={600}>
                {previewFile && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ fontSize: 32 }}>{fileIcon(previewFile.mimeType)}</div>
                            <div>
                                <Text strong style={{ fontSize: 16, display: 'block' }}>{previewFile.name}</Text>
                                <Text type="secondary" style={{ fontSize: 12 }}>{fmtSize(previewFile.sizeBytes)} • Version {previewFile.currentVersion}</Text>
                            </div>
                        </div>
                        <Row gutter={[12, 8]}>
                            {[{ l: 'Type', v: previewFile.mimeType }, { l: 'Status', v: previewFile.status }, { l: 'Created', v: previewFile.createdAt ? dayjs(previewFile.createdAt).format('DD MMM YYYY') : '—' }, { l: 'Owner', v: previewFile.createdBy || '—' }].map((p, i) => (
                                <Col span={12} key={i}><Text type="secondary" style={{ fontSize: 11 }}>{p.l}:</Text><br /><Text style={{ fontSize: 12 }}>{p.v}</Text></Col>
                            ))}
                        </Row>
                        {previewFile.tags?.length > 0 && <Space wrap>{previewFile.tags.map(t => <Tag key={t}>{t}</Tag>)}</Space>}
                    </div>
                )}
            </Modal>
        </CMSLayout>
    );
}
