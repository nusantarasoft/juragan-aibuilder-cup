"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Alert, Button, Card, Form, Input, List, Space, Typography } from "antd";
import { PhoneOutlined, PlusOutlined } from "@ant-design/icons";
import { graphql } from "@/lib/graphqlClient";
import { getStoredToken } from "@/lib/graphqlClient";

const { Title, Text } = Typography;

type WhitelistRow = { id: string; phone: string; label?: string; isOwner: boolean };

export default function WaWhitelistPage() {
    const [storeId, setStoreId] = useState<string>("");
    const [rows, setRows] = useState<WhitelistRow[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const load = useCallback(async (sid: string) => {
        if (!sid) return;
        setLoading(true);
        setError(null);
        try {
            const data = await graphql<{ waWhitelist: WhitelistRow[] }>(
                `query($storeId: String!) { waWhitelist(storeId: $storeId) { id phone label isOwner } }`,
                { variables: { storeId: sid } },
            );
            setRows(data.waWhitelist);
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const token = getStoredToken();
        if (!token) return;
        graphql<{ myTenantStore: { id: string } | null }>(
            `query { myTenantStore { id } }`,
        )
            .then(async (d) => {
                const sid = d.myTenantStore?.id;
                if (sid) {
                    setStoreId(sid);
                    await load(sid);
                }
            })
            .catch(() => undefined);
    }, [load]);

    const addStaff = async (values: { phone: string; label?: string }) => {
        if (!storeId) return;
        await graphql(
            `mutation($input: AddWaStaffInput!) {
                addWaWhitelistStaff(input: $input) { id phone label isOwner }
            }`,
            { variables: { input: { storeId, phone: values.phone, label: values.label } } },
        );
        await load(storeId);
    };

    const linkOwner = async (values: { phone: string }) => {
        if (!storeId) return;
        await graphql(
            `mutation($input: LinkOwnerWaInput!) { linkOwnerWhatsApp(input: $input) }`,
            { variables: { input: { storeId, phone: values.phone } } },
        );
        await load(storeId);
    };

    return (
        <div style={{ padding: 24, maxWidth: 720 }}>
            <Title level={3}>WhatsApp whitelist</Title>
            <Text type="secondary">
                Hanya nomor di daftar ini yang dapat memakai agen toko via WA (pemilik + staff).
            </Text>
            {error && <Alert type="error" message={error} style={{ marginTop: 16 }} showIcon />}
            {!storeId && (
                <Alert
                    style={{ marginTop: 16 }}
                    type="info"
                    message="Store belum terhubung ke sesi ini. Selesaikan pendaftaran atau hubungkan WA pemilik."
                />
            )}
            <Card title="Nomor pemilik" style={{ marginTop: 16 }}>
                <Form layout="inline" onFinish={linkOwner}>
                    <Form.Item name="phone" rules={[{ required: true }]}>
                        <Input prefix={<PhoneOutlined />} placeholder="62812..." />
                    </Form.Item>
                    <Button type="primary" htmlType="submit" disabled={!storeId}>
                        Simpan pemilik
                    </Button>
                </Form>
            </Card>
            <Card title="Staff" style={{ marginTop: 16 }}>
                <Form layout="inline" onFinish={addStaff} style={{ marginBottom: 16 }}>
                    <Form.Item name="phone" rules={[{ required: true }]}>
                        <Input placeholder="628..." />
                    </Form.Item>
                    <Form.Item name="label">
                        <Input placeholder="Label" />
                    </Form.Item>
                    <Button icon={<PlusOutlined />} htmlType="submit" disabled={!storeId}>
                        Tambah
                    </Button>
                </Form>
                <List
                    loading={loading}
                    dataSource={rows}
                    renderItem={(item) => (
                        <List.Item>
                            <Space>
                                <Text strong={item.isOwner}>{item.phone}</Text>
                                {item.isOwner && <Text type="secondary">(pemilik)</Text>}
                                {item.label && <Text type="secondary">{item.label}</Text>}
                            </Space>
                        </List.Item>
                    )}
                />
            </Card>
        </div>
    );
}
