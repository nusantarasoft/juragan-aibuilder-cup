'use client';
import React from 'react';
import { motion } from 'framer-motion';
import CMSLayout from '@/components/layout/CMSLayout';
import { Card, Row, Col, Typography, Statistic, Space, Tag, Button, Table, Badge } from 'antd';
import { ClusterOutlined, CloudServerOutlined, AppstoreOutlined, CheckCircleOutlined, ReloadOutlined, LinkOutlined, DatabaseOutlined } from '@ant-design/icons';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

const NODES = [{ name: 'k3s-node-1', role: 'master', status: 'Ready', version: 'v1.28.5+k3s1', os: 'linux/amd64', cpu: '4 cores', memory: '16 GB' }];
const PODS = [
    { name: 'coredns-5c7d4b', namespace: 'kube-system', status: 'Running', restarts: 0, age: '42d', node: 'k3s-node-1' },
    { name: 'metrics-server-7b9c', namespace: 'kube-system', status: 'Running', restarts: 0, age: '42d', node: 'k3s-node-1' },
    { name: 'local-path-provisioner', namespace: 'kube-system', status: 'Running', restarts: 1, age: '42d', node: 'k3s-node-1' },
    { name: 'traefik-ingress-abc1', namespace: 'kube-system', status: 'Running', restarts: 0, age: '42d', node: 'k3s-node-1' },
];
const SERVICES = [
    { name: 'kubernetes', namespace: 'default', type: 'ClusterIP', clusterIP: '10.43.0.1', ports: '443/TCP' },
    { name: 'kube-dns', namespace: 'kube-system', type: 'ClusterIP', clusterIP: '10.43.0.10', ports: '53/UDP,53/TCP,9153/TCP' },
    { name: 'metrics-server', namespace: 'kube-system', type: 'ClusterIP', clusterIP: '10.43.54.12', ports: '443/TCP' },
    { name: 'traefik', namespace: 'kube-system', type: 'LoadBalancer', clusterIP: '10.43.123.45', ports: '80/TCP,443/TCP' },
];

export default function K3sPage() {
    const { themeColor } = usePreferencesStore();
    const runningPods = PODS.filter(p => p.status === 'Running').length;

    return (
        <CMSLayout title={<AuroraText colors={[themeColor, '#326ce5', '#10b981']}>K3s Kubernetes</AuroraText>} subTitle={<DecryptedText text="Cluster status, pods, services & node health" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />} extra={[<Button key="r" icon={<ReloadOutlined />} />]}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Row gutter={[12, 12]}>
                    {[{ t: 'Nodes', v: NODES.length, c: '#3b82f6', i: <CloudServerOutlined /> }, { t: 'Pods Running', v: `${runningPods}/${PODS.length}`, c: '#10b981', i: <CheckCircleOutlined /> }, { t: 'Services', v: SERVICES.length, c: '#8b5cf6', i: <AppstoreOutlined /> }, { t: 'Namespaces', v: 2, c: '#f59e0b', i: <ClusterOutlined /> }].map((s, i) => (
                        <Col key={i} xs={12} md={6}><motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}><Card size="small" style={{ ...glass, borderTop: `3px solid ${s.c}` }}><Statistic title={s.t} value={s.v} prefix={s.i} valueStyle={{ color: s.c, fontSize: 20 }} /></Card></motion.div></Col>
                    ))}
                </Row>

                <Card size="small" style={glass} title={<Space><CloudServerOutlined style={{ color: '#3b82f6' }} /><Text strong>Nodes</Text></Space>}>
                    {NODES.map(n => (
                        <div key={n.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderRadius: 8, borderLeft: '3px solid #3b82f6', background: 'rgba(0,0,0,0.02)' }}>
                            <div><Text strong style={{ fontSize: 13 }}>{n.name}</Text><br /><Text type="secondary" style={{ fontSize: 10 }}>{n.version} · {n.os}</Text></div>
                            <Space><Tag style={{ fontSize: 10, borderRadius: 8 }}>{n.role}</Tag><Tag style={{ fontSize: 10 }}>{n.cpu} · {n.memory}</Tag><Tag color="green" style={{ borderRadius: 10, fontSize: 10 }}>{n.status}</Tag></Space>
                        </div>
                    ))}
                </Card>

                <Card size="small" style={glass} title={<Space><AppstoreOutlined style={{ color: '#10b981' }} /><Text strong>Pods</Text><Badge count={PODS.length} style={{ backgroundColor: '#10b981' }} /></Space>}>
                    <Table dataSource={PODS} rowKey="name" size="small" pagination={false} columns={[
                        { title: 'Pod', dataIndex: 'name', render: (v: string) => <Text strong style={{ fontSize: 11, fontFamily: 'monospace' }}>{v}</Text> },
                        { title: 'Namespace', dataIndex: 'namespace', render: (v: string) => <Tag style={{ fontSize: 10, borderRadius: 8 }}>{v}</Tag> },
                        { title: 'Status', dataIndex: 'status', width: 80, render: (v: string) => <Tag color="green" style={{ borderRadius: 10, fontSize: 10 }}>{v}</Tag> },
                        { title: 'Restarts', dataIndex: 'restarts', width: 70, render: (v: number) => <Text style={{ color: v > 0 ? '#f59e0b' : '#10b981' }}>{v}</Text> },
                        { title: 'Age', dataIndex: 'age', width: 60 },
                    ]} />
                </Card>

                <Card size="small" style={glass} title={<Space><DatabaseOutlined style={{ color: '#8b5cf6' }} /><Text strong>Services</Text></Space>}>
                    <Table dataSource={SERVICES} rowKey="name" size="small" pagination={false} columns={[
                        { title: 'Service', dataIndex: 'name', render: (v: string) => <Text strong style={{ fontSize: 12, fontFamily: 'monospace' }}>{v}</Text> },
                        { title: 'Namespace', dataIndex: 'namespace', render: (v: string) => <Tag style={{ fontSize: 10, borderRadius: 8 }}>{v}</Tag> },
                        { title: 'Type', dataIndex: 'type', render: (v: string) => <Tag color={v === 'LoadBalancer' ? 'blue' : 'default'} style={{ borderRadius: 8, fontSize: 10 }}>{v}</Tag> },
                        { title: 'Cluster IP', dataIndex: 'clusterIP', render: (v: string) => <Text style={{ fontSize: 11, fontFamily: 'monospace' }}>{v}</Text> },
                        { title: 'Ports', dataIndex: 'ports', render: (v: string) => <Text type="secondary" style={{ fontSize: 10 }}>{v}</Text> },
                    ]} />
                </Card>
            </motion.div>
        </CMSLayout>
    );
}
