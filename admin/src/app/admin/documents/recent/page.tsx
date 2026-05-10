'use client';
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import CMSLayout from '@/components/layout/CMSLayout';
import { Card, Table, Typography, Tag, Spin, Empty, Space, Button, Tooltip } from 'antd';
import { ClockCircleOutlined, FileOutlined, FileImageOutlined, FilePdfOutlined, FileExcelOutlined, FileWordOutlined, FileUnknownOutlined, EyeOutlined, DownloadOutlined } from '@ant-design/icons';
import { documentService, DocFile } from '@/lib/documentService';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };
const fmtSize = (b: number) => { if (b >= 1e6) return `${(b/1e6).toFixed(1)} MB`; if (b >= 1e3) return `${(b/1e3).toFixed(1)} KB`; return `${b} B`; };

const fileIcon = (mime?: string) => {
    if (!mime) return <FileUnknownOutlined style={{ color: '#6b7280' }} />;
    if (mime.includes('image')) return <FileImageOutlined style={{ color: '#10b981' }} />;
    if (mime.includes('pdf')) return <FilePdfOutlined style={{ color: '#ef4444' }} />;
    if (mime.includes('excel') || mime.includes('spreadsheet')) return <FileExcelOutlined style={{ color: '#10b981' }} />;
    if (mime.includes('word') || mime.includes('document')) return <FileWordOutlined style={{ color: '#3b82f6' }} />;
    return <FileOutlined style={{ color: '#6366f1' }} />;
};

export default function RecentDocumentsPage() {
    const { themeColor } = usePreferencesStore();
    const [loading, setLoading] = useState(true);
    const [files, setFiles] = useState<DocFile[]>([]);

    useEffect(() => { (async () => { setLoading(true); try { setFiles(await documentService.getRecentFiles(undefined, 50)); } catch {} finally { setLoading(false); } })(); }, []);

    const columns = [
        {
            title: 'Document', key: 'name', ellipsis: true,
            render: (_: any, r: DocFile) => (
                <Space>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(99,102,241,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{fileIcon(r.mimeType)}</div>
                    <div>
                        <Text strong style={{ display: 'block', fontSize: 13 }}>{r.name}</Text>
                        <Text type="secondary" style={{ fontSize: 11 }}>{fmtSize(r.sizeBytes)} • v{r.currentVersion}</Text>
                    </div>
                </Space>
            ),
        },
        { title: 'Type', key: 'type', width: 100, render: (_: any, r: DocFile) => <Tag>{(r.mimeType || 'unknown').split('/').pop()}</Tag> },
        { title: 'Modified', key: 'mod', width: 160, render: (_: any, r: DocFile) => <Tooltip title={r.updatedAt ? dayjs(r.updatedAt).format('DD MMM YYYY HH:mm') : ''}><Text type="secondary" style={{ fontSize: 12 }}><ClockCircleOutlined style={{ marginRight: 4 }} />{r.updatedAt ? dayjs(r.updatedAt).fromNow() : '—'}</Text></Tooltip> },
        { title: 'Owner', dataIndex: 'createdBy', key: 'owner', width: 100, render: (v: string) => v || '—' },
        { title: 'Status', key: 'st', width: 90, render: (_: any, r: DocFile) => <Tag color={r.status === 'active' ? 'green' : r.status === 'archived' ? 'orange' : 'default'}>{r.status}</Tag> },
        { title: 'Tags', key: 'tags', width: 150, render: (_: any, r: DocFile) => r.tags?.length ? <Space wrap size={4}>{r.tags.slice(0, 2).map(t => <Tag key={t} style={{ fontSize: 10 }}>{t}</Tag>)}{r.tags.length > 2 && <Tag style={{ fontSize: 10 }}>+{r.tags.length - 2}</Tag>}</Space> : '—' },
    ];

    return (
        <CMSLayout title={<AuroraText colors={[themeColor, "var(--theme-secondary, #6366f1)", "var(--theme-accent, #a78bfa)"]}>Recent Documents</AuroraText>}
            subTitle={<DecryptedText text="Recently uploaded and modified files" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35 }}>
                <Card style={glass}>
                    {loading ? <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div> :
                        files.length === 0 ? <Empty description="No recent documents found." /> :
                        <Table scroll={{ x: 800 }} dataSource={files.map(f => ({ ...f, key: f.id }))} columns={columns} size="small" pagination={{ pageSize: 20, showTotal: t => `${t} documents` }} />
                    }
                </Card>
            </motion.div>
        </CMSLayout>
    );
}
