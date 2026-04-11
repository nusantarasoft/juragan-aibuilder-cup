"use client";

import React, { useState, useEffect } from "react";
import { Card, Typography, Form, Input, InputNumber, Switch, Select, Button, Space, message, Row, Col, Divider, Tag } from "antd";
import { SettingOutlined, SaveOutlined, ShopOutlined, DollarOutlined, TruckOutlined, CreditCardOutlined, InboxOutlined, TagOutlined, ScheduleOutlined, SwapOutlined } from "@ant-design/icons";
import { motion } from "framer-motion";
import CMSLayout from "@/components/layout/CMSLayout";
import { inventoryService, EcomStoreSettings } from "@/lib/inventoryService";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { AuroraText } from "@/components/magicui/aurora-text";

const { Text, Title } = Typography;

export default function SettingsPage() {
    const [settings, setSettings] = useState<EcomStoreSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [form] = Form.useForm();

    useEffect(() => { load(); }, []);

    const load = async () => {
        setLoading(true);
        try {
            const data = await inventoryService.getStoreSettings();
            setSettings(data);
            if (data) {
                form.setFieldsValue({
                    storeName: data.storeName, storeEmail: data.storeEmail,
                    storePhone: data.storePhone, storeAddress: data.storeAddress,
                    defaultCurrency: data.defaultCurrency, taxRate: data.taxRate,
                    taxIncluded: data.taxIncluded, shippingEnabled: data.shippingEnabled,
                    defaultShippingCost: data.defaultShippingCost,
                    freeShippingThreshold: data.freeShippingThreshold,
                    lowStockAlert: data.lowStockAlert,
                    orderPrefix: data.orderPrefix, invoicePrefix: data.invoicePrefix,
                    notes: data.notes,
                });
            }
        } catch (err) { console.error(err); message.error("Failed to load settings"); } finally { setLoading(false); }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const values = form.getFieldsValue();
            await inventoryService.updateStoreSettings('default', values);
            message.success("Settings saved!");
            load();
        } catch { message.error("Failed to save settings"); } finally { setSaving(false); }
    };

    const sectionCard = (title: string, icon: React.ReactNode, color: string, children: React.ReactNode) => (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card size="small" style={{ borderRadius: 12, background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.5)' }}>
                <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}15`, color, fontSize: 16 }}>{icon}</div>
                    <Text strong style={{ background: `linear-gradient(to right, ${color}, #6366f1)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontSize: 14 }}>{title}</Text>
                </div>
                {children}
            </Card>
        </motion.div>
    );

    const paymentMethods = settings?.paymentMethods || [];

    return (
        <CMSLayout
            title={<AuroraText colors={["#6366f1", "#8b5cf6", "#a78bfa", "#00ffff", "#ff00ff"]}>Store Settings</AuroraText>}
            subTitle={<DecryptedText text="Configure your store, payments, and fulfillment rules" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 900 }}>
                <Form form={form} layout="vertical">
                    {/* Store Info */}
                    {sectionCard('Store Information', <ShopOutlined />, '#6366f1', (
                        <>
                            <Row gutter={16}>
                                <Col span={12}><Form.Item name="storeName" label="Store Name"><Input /></Form.Item></Col>
                                <Col span={12}><Form.Item name="storeEmail" label="Email"><Input /></Form.Item></Col>
                            </Row>
                            <Row gutter={16}>
                                <Col span={8}><Form.Item name="storePhone" label="Phone"><Input /></Form.Item></Col>
                                <Col span={16}><Form.Item name="storeAddress" label="Address"><Input /></Form.Item></Col>
                            </Row>
                            <Row gutter={16}>
                                <Col span={8}><Form.Item name="orderPrefix" label="Order Prefix"><Input /></Form.Item></Col>
                                <Col span={8}><Form.Item name="invoicePrefix" label="Invoice Prefix"><Input /></Form.Item></Col>
                            </Row>
                        </>
                    ))}

                    {/* Tax & Currency */}
                    {sectionCard('Tax & Currency', <DollarOutlined />, '#f59e0b', (
                        <Row gutter={16}>
                            <Col span={8}><Form.Item name="defaultCurrency" label="Currency"><Input /></Form.Item></Col>
                            <Col span={8}><Form.Item name="taxRate" label="Tax Rate (%)"><InputNumber min={0} max={100} style={{ width: '100%' }} /></Form.Item></Col>
                            <Col span={8}><Form.Item name="taxIncluded" label="Tax Included" valuePropName="checked"><Switch /></Form.Item></Col>
                        </Row>
                    ))}

                    {/* Shipping */}
                    {sectionCard('Shipping', <TruckOutlined />, '#3b82f6', (
                        <Row gutter={16}>
                            <Col span={8}><Form.Item name="shippingEnabled" label="Shipping Enabled" valuePropName="checked"><Switch /></Form.Item></Col>
                            <Col span={8}><Form.Item name="defaultShippingCost" label="Default Shipping Cost"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
                            <Col span={8}><Form.Item name="freeShippingThreshold" label="Free Shipping Threshold"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
                        </Row>
                    ))}

                    {/* Payment Methods */}
                    {sectionCard('Payment Methods', <CreditCardOutlined />, '#8b5cf6', (
                        <div className="flex gap-2 flex-wrap">
                            {Array.isArray(paymentMethods) && paymentMethods.map((m: string) => (
                                <Tag key={m} color="purple" className="rounded-full capitalize text-sm px-3 py-1">{m.replace('_', ' ')}</Tag>
                            ))}
                            {(!paymentMethods || paymentMethods.length === 0) && <Text type="secondary">No payment methods configured</Text>}
                        </div>
                    ))}

                    {/* Fulfillment Rules */}
                    {sectionCard('Fulfillment Configuration', <SettingOutlined />, '#10b981', (
                        <Row gutter={[16, 12]}>
                            <Col span={12}>
                                <Card size="small" style={{ borderRadius: 8, borderLeft: '3px solid #3b82f6' }}>
                                    <div className="flex items-center gap-2 mb-1"><InboxOutlined style={{ color: '#3b82f6' }} /><Text strong className="text-xs">Physical</Text></div>
                                    <Text type="secondary" className="text-xs">Auto stock deduct, require shipping</Text>
                                </Card>
                            </Col>
                            <Col span={12}>
                                <Card size="small" style={{ borderRadius: 8, borderLeft: '3px solid #8b5cf6' }}>
                                    <div className="flex items-center gap-2 mb-1"><TagOutlined style={{ color: '#8b5cf6' }} /><Text strong className="text-xs">Ticket</Text></div>
                                    <Text type="secondary" className="text-xs">Auto QR generation, send email</Text>
                                </Card>
                            </Col>
                            <Col span={12}>
                                <Card size="small" style={{ borderRadius: 8, borderLeft: '3px solid #06b6d4' }}>
                                    <div className="flex items-center gap-2 mb-1"><ScheduleOutlined style={{ color: '#06b6d4' }} /><Text strong className="text-xs">Scheduled</Text></div>
                                    <Text type="secondary" className="text-xs">Auto booking, require passenger info</Text>
                                </Card>
                            </Col>
                            <Col span={12}>
                                <Card size="small" style={{ borderRadius: 8, borderLeft: '3px solid #f59e0b' }}>
                                    <div className="flex items-center gap-2 mb-1"><SwapOutlined style={{ color: '#f59e0b' }} /><Text strong className="text-xs">Rental</Text></div>
                                    <Text type="secondary" className="text-xs">ID verification, collect deposit</Text>
                                </Card>
                            </Col>
                        </Row>
                    ))}

                    {/* Alerts & Notes */}
                    {sectionCard('Alerts & Notes', <SettingOutlined />, '#ef4444', (
                        <>
                            <Form.Item name="lowStockAlert" label="Low Stock Alerts" valuePropName="checked"><Switch /></Form.Item>
                            <Form.Item name="notes" label="Internal Notes"><Input.TextArea rows={3} /></Form.Item>
                        </>
                    ))}

                    {/* Save Button */}
                    <div className="flex justify-end">
                        <Button type="primary" icon={<SaveOutlined />} size="large" loading={saving} onClick={handleSave}
                            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', borderRadius: 10, border: 'none', paddingInline: 32 }}>
                            Save Settings
                        </Button>
                    </div>
                </Form>
            </div>
        </CMSLayout>
    );
}
