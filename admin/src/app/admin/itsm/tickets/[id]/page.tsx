"use client";

import React, { useState, useEffect, useCallback } from "react";
import { ProCard } from "@ant-design/pro-components";
import { Button, message, Tag, Space, Typography, Descriptions, Timeline, Input, Switch, Divider, Row, Col, Tooltip, Badge } from "antd";
import {
    ArrowLeftOutlined, ClockCircleOutlined, UserOutlined, SendOutlined,
    TeamOutlined, LinkOutlined, ExclamationCircleOutlined, CheckCircleOutlined,
    CustomerServiceOutlined,
} from "@ant-design/icons";
import { gql } from "@/lib/graphql";
import { useRouter, useParams } from "next/navigation";

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const GET_TICKET = `query($id: String!) { itsmTicket(id: $id) { id ticketNumber title description categoryId priority status impact urgency contactId accountId individualId pmStakeholderId reporterName reporterEmail assignedTo assignedGroup slaPolicyId slaResponseDue slaResolutionDue slaResponseMet slaResolutionMet channel resolutionNotes resolvedAt closedAt createdAt updatedAt } }`;
const GET_COMMENTS = `query($ticketId: String!) { itsmTicketComments(ticketId: $ticketId) { id author content isInternal createdAt } }`;
const GET_CATEGORIES = `query { itsmCategories { id name } }`;
const ADD_COMMENT = `mutation($input: AddItsmCommentInput!) { addItsmComment(input: $input) { id } }`;
const UPDATE_TICKET = `mutation($id: ID!, $input: UpdateItsmTicketInput!) { updateItsmTicket(id: $id, input: $input) { id } }`;

const priorityColors: Record<string, string> = { critical: '#f5222d', high: '#fa8c16', medium: '#1890ff', low: '#52c41a' };
const statusColors: Record<string, string> = { new: 'blue', open: 'cyan', in_progress: 'geekblue', pending: 'orange', resolved: 'green', closed: 'default' };

function SlaCountdown({ due }: { due: string }) {
    const [remaining, setRemaining] = useState('');
    const [breach, setBreach] = useState(false);
    useEffect(() => {
        const update = () => {
            const diff = new Date(due).getTime() - Date.now();
            if (diff <= 0) { setBreach(true); setRemaining('BREACHED'); return; }
            const h = Math.floor(diff / 3600000);
            const m = Math.floor((diff % 3600000) / 60000);
            setRemaining(`${h}h ${m}m`);
            setBreach(false);
        };
        update();
        const iv = setInterval(update, 60000);
        return () => clearInterval(iv);
    }, [due]);
    return <Tag color={breach ? 'red' : 'green'} icon={breach ? <ExclamationCircleOutlined /> : <ClockCircleOutlined />}>{remaining}</Tag>;
}

export default function TicketDetailPage() {
    const router = useRouter();
    const params = useParams();
    const ticketId = params?.id as string;
    const [messageApi, contextHolder] = message.useMessage();
    const [ticket, setTicket] = useState<any>(null);
    const [comments, setComments] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [commentText, setCommentText] = useState('');
    const [isInternal, setIsInternal] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [t, c, cats] = await Promise.all([
                gql(GET_TICKET, { id: ticketId }),
                gql(GET_COMMENTS, { ticketId }),
                gql(GET_CATEGORIES),
            ]);
            setTicket(t.itsmTicket);
            setComments(c.itsmTicketComments || []);
            setCategories(cats.itsmCategories || []);
        } catch (err: any) { messageApi.error(err.message); }
        finally { setLoading(false); }
    }, [ticketId, messageApi]);

    useEffect(() => { load(); }, [load]);

    const handleAddComment = async () => {
        if (!commentText.trim()) return;
        setSubmitting(true);
        try {
            await gql(ADD_COMMENT, { input: { ticketId, content: commentText, isInternal, author: 'Admin' } });
            setCommentText('');
            messageApi.success('Comment added.');
            load();
        } catch (err: any) { messageApi.error(err.message); }
        finally { setSubmitting(false); }
    };

    const handleStatusChange = async (newStatus: string) => {
        try {
            await gql(UPDATE_TICKET, { id: ticketId, input: { status: newStatus } });
            messageApi.success(`Status changed to ${newStatus.replace('_', ' ')}`);
            load();
        } catch (err: any) { messageApi.error(err.message); }
    };

    const categoryName = categories.find(c => c.id === ticket?.categoryId)?.name || '-';

    if (loading) return <div style={{ padding: 24 }}><ProCard loading bordered /></div>;
    if (!ticket) return <div style={{ padding: 24 }}><Text>Ticket not found.</Text></div>;

    return (
        <div style={{ padding: 24 }}>
            {contextHolder}
            <Space style={{ marginBottom: 16 }}>
                <Button icon={<ArrowLeftOutlined />} onClick={() => router.push('/admin/itsm/tickets')}>Back to Tickets</Button>
            </Space>

            {/* Header */}
            <ProCard bordered style={{ marginBottom: 16 }}>
                <Row justify="space-between" align="middle">
                    <Col>
                        <Space size={12} align="center">
                            <Tag color="purple" style={{ fontSize: 16, padding: '4px 12px', fontFamily: 'monospace' }}>{ticket.ticketNumber}</Tag>
                            <Title level={4} style={{ margin: 0 }}>{ticket.title}</Title>
                        </Space>
                    </Col>
                    <Col>
                        <Space>
                            <Tag color={priorityColors[ticket.priority]} style={{ fontSize: 13 }}>{(ticket.priority || '').toUpperCase()}</Tag>
                            <Tag color={statusColors[ticket.status]} style={{ fontSize: 13 }}>{(ticket.status || '').replace('_', ' ').toUpperCase()}</Tag>
                        </Space>
                    </Col>
                </Row>
            </ProCard>

            <Row gutter={[16, 16]}>
                {/* Left Side — Detail + Activity */}
                <Col xs={24} lg={16}>
                    {/* Description */}
                    <ProCard title="Description" bordered style={{ marginBottom: 16 }}>
                        <Paragraph>{ticket.description || <Text type="secondary" italic>No description provided.</Text>}</Paragraph>
                    </ProCard>

                    {/* Resolution */}
                    {ticket.resolutionNotes && (
                        <ProCard title={<Space><CheckCircleOutlined style={{ color: '#52c41a' }} /> Resolution</Space>} bordered style={{ marginBottom: 16 }}>
                            <Paragraph>{ticket.resolutionNotes}</Paragraph>
                        </ProCard>
                    )}

                    {/* Activity Timeline */}
                    <ProCard title="Activity" bordered style={{ marginBottom: 16 }}>
                        <Timeline
                            items={comments.map(c => ({
                                color: c.isInternal ? 'orange' : 'blue',
                                children: (
                                    <div>
                                        <Space>
                                            <Text strong>{c.author}</Text>
                                            {c.isInternal && <Tag color="orange" style={{ fontSize: 10 }}>INTERNAL</Tag>}
                                            <Text type="secondary" style={{ fontSize: 12 }}>{new Date(c.createdAt).toLocaleString()}</Text>
                                        </Space>
                                        <Paragraph style={{ marginTop: 4, marginBottom: 0 }}>{c.content}</Paragraph>
                                    </div>
                                ),
                            }))}
                        />
                        {comments.length === 0 && <Text type="secondary">No comments yet.</Text>}

                        <Divider />
                        <TextArea rows={3} value={commentText} onChange={e => setCommentText(e.target.value)} placeholder="Add a comment..." />
                        <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Space><Switch checked={isInternal} onChange={setIsInternal} size="small" /><Text type="secondary">Internal Note</Text></Space>
                            <Button type="primary" icon={<SendOutlined />} onClick={handleAddComment} loading={submitting} disabled={!commentText.trim()}>
                                {isInternal ? 'Add Internal Note' : 'Reply'}
                            </Button>
                        </div>
                    </ProCard>
                </Col>

                {/* Right Side — Info Panel */}
                <Col xs={24} lg={8}>
                    {/* Ticket Info */}
                    <ProCard title="Details" bordered style={{ marginBottom: 16 }}>
                        <Descriptions column={1} size="small">
                            <Descriptions.Item label="Category">{categoryName}</Descriptions.Item>
                            <Descriptions.Item label="Impact"><Tag>{(ticket.impact || '').toUpperCase()}</Tag></Descriptions.Item>
                            <Descriptions.Item label="Urgency"><Tag>{(ticket.urgency || '').toUpperCase()}</Tag></Descriptions.Item>
                            <Descriptions.Item label="Channel">{ticket.channel || '-'}</Descriptions.Item>
                            <Descriptions.Item label="Created">{new Date(ticket.createdAt).toLocaleString()}</Descriptions.Item>
                            <Descriptions.Item label="Updated">{new Date(ticket.updatedAt).toLocaleString()}</Descriptions.Item>
                        </Descriptions>
                    </ProCard>

                    {/* Reporter Info with Cross-Module Links */}
                    <ProCard title={<Space><UserOutlined /> Reporter</Space>} bordered style={{ marginBottom: 16 }}>
                        <Descriptions column={1} size="small">
                            <Descriptions.Item label="Name">{ticket.reporterName || '-'}</Descriptions.Item>
                            <Descriptions.Item label="Email">{ticket.reporterEmail || '-'}</Descriptions.Item>
                        </Descriptions>
                        <Divider style={{ margin: '8px 0' }} />
                        <Space direction="vertical" size={4}>
                            <Text type="secondary" style={{ fontSize: 11 }}>Linked Entities:</Text>
                            {ticket.contactId && (
                                <Tooltip title="View CRM Contact">
                                    <Button type="link" size="small" icon={<LinkOutlined />} onClick={() => router.push('/admin/crm/contacts')}>
                                        📇 CRM Contact
                                    </Button>
                                </Tooltip>
                            )}
                            {ticket.individualId && (
                                <Tooltip title="View CRM Individual">
                                    <Button type="link" size="small" icon={<LinkOutlined />} onClick={() => router.push('/admin/crm/individuals')}>
                                        👤 CRM Individual
                                    </Button>
                                </Tooltip>
                            )}
                            {ticket.accountId && (
                                <Tooltip title="View CRM Account">
                                    <Button type="link" size="small" icon={<LinkOutlined />} onClick={() => router.push('/admin/crm/accounts')}>
                                        🏢 CRM Account
                                    </Button>
                                </Tooltip>
                            )}
                            {ticket.pmStakeholderId && (
                                <Tooltip title="View PM Stakeholder">
                                    <Button type="link" size="small" icon={<LinkOutlined />} onClick={() => router.push('/admin/pm/projects')}>
                                        📋 PM Stakeholder
                                    </Button>
                                </Tooltip>
                            )}
                            {!ticket.contactId && !ticket.individualId && !ticket.accountId && !ticket.pmStakeholderId && (
                                <Text type="secondary" italic>No linked entities</Text>
                            )}
                        </Space>
                    </ProCard>

                    {/* Assignment */}
                    <ProCard title={<Space><TeamOutlined /> Assignment</Space>} bordered style={{ marginBottom: 16 }}>
                        <Descriptions column={1} size="small">
                            <Descriptions.Item label="Agent">{ticket.assignedTo || <Text type="secondary">Unassigned</Text>}</Descriptions.Item>
                            <Descriptions.Item label="Group">{ticket.assignedGroup || '-'}</Descriptions.Item>
                        </Descriptions>
                    </ProCard>

                    {/* SLA */}
                    <ProCard title={<Space><ClockCircleOutlined /> SLA</Space>} bordered style={{ marginBottom: 16 }}>
                        <Descriptions column={1} size="small">
                            <Descriptions.Item label="Response Due">
                                {ticket.slaResponseDue ? <SlaCountdown due={ticket.slaResponseDue} /> : '-'}
                            </Descriptions.Item>
                            <Descriptions.Item label="Resolution Due">
                                {ticket.slaResolutionDue ? <SlaCountdown due={ticket.slaResolutionDue} /> : '-'}
                            </Descriptions.Item>
                        </Descriptions>
                    </ProCard>

                    {/* Quick Actions */}
                    <ProCard title="Quick Actions" bordered>
                        <Space direction="vertical" style={{ width: '100%' }}>
                            {ticket.status === 'new' && <Button block onClick={() => handleStatusChange('open')}>Open Ticket</Button>}
                            {(ticket.status === 'new' || ticket.status === 'open') && <Button block type="primary" onClick={() => handleStatusChange('in_progress')}>Start Working</Button>}
                            {ticket.status === 'in_progress' && <Button block onClick={() => handleStatusChange('pending')}>Set Pending</Button>}
                            {(ticket.status === 'in_progress' || ticket.status === 'pending') && <Button block type="primary" style={{ background: '#52c41a' }} onClick={() => handleStatusChange('resolved')}>Resolve</Button>}
                            {ticket.status === 'resolved' && <Button block onClick={() => handleStatusChange('closed')}>Close Ticket</Button>}
                        </Space>
                    </ProCard>
                </Col>
            </Row>
        </div>
    );
}
