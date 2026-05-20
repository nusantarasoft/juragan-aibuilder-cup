'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import CMSLayout from '@/components/layout/CMSLayout';
import { Card, Row, Col, Typography, Button, Space, Tag, Spin, Empty, Modal, Form, Input, Select, Table, Statistic, message, Tooltip, Badge, Popconfirm } from 'antd';
import { ShareAltOutlined, PlusOutlined, TwitterOutlined, FacebookOutlined, LinkedinOutlined, InstagramOutlined, SendOutlined, DeleteOutlined, ReloadOutlined, HeartOutlined, MessageOutlined, RetweetOutlined, EyeOutlined, UserOutlined } from '@ant-design/icons';
import { newsService, NewsSocialAccount, NewsSocialPost } from '@/lib/newsService';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };
const platformColors: Record<string, string> = { twitter: '#1DA1F2', facebook: '#4267B2', linkedin: '#0077B5', instagram: '#E4405F', tiktok: '#000000' };
const platformIcons: Record<string, React.ReactNode> = { twitter: <TwitterOutlined />, facebook: <FacebookOutlined />, linkedin: <LinkedinOutlined />, instagram: <InstagramOutlined />, tiktok: <EyeOutlined /> };
const fmtK = (v: number) => { if (v >= 1e6) return `${(v/1e6).toFixed(1)}M`; if (v >= 1e3) return `${(v/1e3).toFixed(1)}K`; return String(v); };

export default function SocialMediaPage() {
    const { themeColor } = usePreferencesStore();
    const [loading, setLoading] = useState(true);
    const [accounts, setAccounts] = useState<NewsSocialAccount[]>([]);
    const [posts, setPosts] = useState<NewsSocialPost[]>([]);
    const [accountModal, setAccountModal] = useState(false);
    const [postModal, setPostModal] = useState(false);
    const [accountForm] = Form.useForm();
    const [postForm] = Form.useForm();

    const load = useCallback(async () => { setLoading(true); try { const [a, p] = await Promise.all([newsService.getSocialAccounts(), newsService.getSocialPosts()]); setAccounts(a); setPosts(p); } catch (e: any) { message.error(e.message); } finally { setLoading(false); } }, []);
    useEffect(() => { load(); }, [load]);

    const addAccount = async () => { try { const v = await accountForm.validateFields(); await newsService.createSocialAccount(undefined, v); message.success('Account connected'); setAccountModal(false); accountForm.resetFields(); load(); } catch (e: any) { if (e.message) message.error(e.message); } };
    const addPost = async () => { try { const v = await postForm.validateFields(); await newsService.createSocialPost(undefined, v); message.success('Post created'); setPostModal(false); postForm.resetFields(); load(); } catch (e: any) { if (e.message) message.error(e.message); } };
    const delAccount = async (id: string) => { try { await newsService.deleteSocialAccount(id); message.success('Removed'); load(); } catch (e: any) { message.error(e.message); } };

    const totalFollowers = accounts.reduce((s, a) => s + (a.followersCount || 0), 0);
    const totalPosts = posts.length;
    const published = posts.filter(p => p.status === 'published').length;
    const scheduled = posts.filter(p => p.status === 'scheduled').length;

    if (loading) return <CMSLayout title="Social Media"><div style={{ textAlign: 'center', padding: 100 }}><Spin size="large" /></div></CMSLayout>;

    return (
        <CMSLayout title={<AuroraText colors={[themeColor, '#1DA1F2', '#E4405F']}>Social Media</AuroraText>} subTitle={<DecryptedText text="Multi-platform social media monitoring & publishing" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />} extra={[
            <Button key="acc" icon={<PlusOutlined />} onClick={() => { accountForm.resetFields(); setAccountModal(true); }}>Connect Account</Button>,
            <Button key="post" type="primary" icon={<SendOutlined />} onClick={() => { postForm.resetFields(); setPostModal(true); }} style={{ borderRadius: 8, background: `linear-gradient(135deg, ${themeColor}, ${themeColor}dd)` }}>New Post</Button>,
            <Button key="r" icon={<ReloadOutlined />} onClick={load} />,
        ]}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <Row gutter={[12, 12]}>
                    {[{ t: 'Connected', v: accounts.length, c: '#3b82f6' }, { t: 'Total Followers', v: fmtK(totalFollowers), c: '#10b981' }, { t: 'Published', v: published, c: '#8b5cf6' }, { t: 'Scheduled', v: scheduled, c: '#f59e0b' }].map((s, i) => (
                        <Col key={i} xs={12} md={6}><motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}><Card size="small" style={{ ...glass, borderTop: `3px solid ${s.c}` }}><Statistic title={s.t} value={s.v} valueStyle={{ color: s.c, fontSize: 20 }} /></Card></motion.div></Col>
                    ))}
                </Row>

                <Card title={<><ShareAltOutlined style={{ color: themeColor }} /> <Text strong>Connected Accounts</Text> <Badge count={accounts.length} style={{ backgroundColor: themeColor }} /></>} style={glass} size="small">
                    {accounts.length === 0 ? <Empty description="No social accounts connected yet" /> : (
                        <Row gutter={[12, 12]}>
                            {accounts.map((a, i) => (
                                <Col key={a.id} xs={24} sm={12} md={8} lg={6}>
                                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}>
                                        <Card size="small" hoverable style={{ borderLeft: `3px solid ${platformColors[a.platform] || themeColor}`, borderRadius: 10 }} actions={[<Popconfirm key="del" title="Remove?" onConfirm={() => delAccount(a.id)}><DeleteOutlined style={{ color: '#ef4444' }} /></Popconfirm>]}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                                                <div style={{ width: 36, height: 36, borderRadius: '50%', background: `${platformColors[a.platform]}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: platformColors[a.platform] }}>{platformIcons[a.platform] || <ShareAltOutlined />}</div>
                                                <div><Text strong style={{ fontSize: 13 }}>{a.displayName || a.accountName}</Text><br /><Tag color={platformColors[a.platform]} style={{ fontSize: 9, borderRadius: 6 }}>{a.platform}</Tag></div>
                                            </div>
                                            <Space split="·" style={{ fontSize: 11 }}>
                                                <Text type="secondary"><UserOutlined /> {fmtK(a.followersCount)}</Text>
                                                <Text type="secondary">{a.postsCount} posts</Text>
                                            </Space>
                                            <div style={{ marginTop: 6 }}><Tag color={a.status === 'connected' ? 'green' : 'red'} style={{ fontSize: 10 }}>{a.status}</Tag></div>
                                        </Card>
                                    </motion.div>
                                </Col>
                            ))}
                        </Row>
                    )}
                </Card>

                <Card title={<><SendOutlined style={{ color: themeColor }} /> <Text strong>Posts</Text> <Badge count={totalPosts} style={{ backgroundColor: '#3b82f6' }} /></>} style={glass}>
                    {posts.length === 0 ? <Empty description="No posts yet" /> :
                        <Table size="small" scroll={{ x: 700 }} dataSource={posts.map(p => ({ ...p, key: p.id }))} pagination={{ pageSize: 15 }} columns={[
                            { title: 'Platform', key: 'p', width: 100, render: (_: any, r: NewsSocialPost) => <Tag color={platformColors[r.platform]} icon={platformIcons[r.platform]}>{r.platform}</Tag> },
                            { title: 'Content', dataIndex: 'content', ellipsis: true },
                            { title: 'Status', dataIndex: 'status', width: 100, render: (v: string) => <Tag color={v === 'published' ? 'green' : v === 'scheduled' ? 'blue' : 'default'}>{v}</Tag> },
                            { title: 'Date', key: 'd', width: 140, render: (_: any, r: NewsSocialPost) => <Text style={{ fontSize: 11 }}>{r.publishedAt ? dayjs(r.publishedAt).format('DD MMM HH:mm') : r.scheduledAt ? dayjs(r.scheduledAt).format('DD MMM HH:mm') : '—'}</Text> },
                            { title: '', key: 'a', width: 50, render: (_: any, r: NewsSocialPost) => <Popconfirm title="Delete?" onConfirm={() => newsService.deleteSocialPost(r.id).then(load)}><Button type="text" size="small" icon={<DeleteOutlined />} danger /></Popconfirm> },
                        ]} />
                    }
                </Card>
            </motion.div>

            <Modal title="Connect Social Account" open={accountModal} onOk={addAccount} onCancel={() => setAccountModal(false)} okText="Connect">
                <Form form={accountForm} layout="vertical" style={{ marginTop: 12 }}>
                    <Form.Item name="platform" label="Platform" rules={[{ required: true }]}><Select options={[{ label: '𝕏 Twitter/X', value: 'twitter' }, { label: 'Facebook', value: 'facebook' }, { label: 'LinkedIn', value: 'linkedin' }, { label: 'Instagram', value: 'instagram' }, { label: 'TikTok', value: 'tiktok' }]} /></Form.Item>
                    <Form.Item name="accountName" label="Account Handle" rules={[{ required: true }]}><Input placeholder="@username" /></Form.Item>
                    <Form.Item name="displayName" label="Display Name"><Input placeholder="Company Name" /></Form.Item>
                    <Form.Item name="profileUrl" label="Profile URL"><Input placeholder="https://twitter.com/..." /></Form.Item>
                </Form>
            </Modal>

            <Modal title="Create Post" open={postModal} onOk={addPost} onCancel={() => setPostModal(false)} okText="Create">
                <Form form={postForm} layout="vertical" style={{ marginTop: 12 }}>
                    <Form.Item name="platform" label="Platform" rules={[{ required: true }]}><Select options={accounts.map(a => ({ label: `${a.platform} — ${a.accountName}`, value: a.platform }))} /></Form.Item>
                    <Form.Item name="content" label="Content" rules={[{ required: true }]}><Input.TextArea rows={4} placeholder="Write your post..." showCount maxLength={280} /></Form.Item>
                    <Form.Item name="hashtags" label="Hashtags"><Select mode="tags" placeholder="Add hashtags" /></Form.Item>
                </Form>
            </Modal>
        </CMSLayout>
    );
}
