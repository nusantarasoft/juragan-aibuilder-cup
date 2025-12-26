"use client";

import React, { useState } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import {
    Card,
    Form,
    Input,
    Button,
    Switch,
    ColorPicker,
    Tabs,
    Upload,
    message,
    Divider,
} from "antd";
import {
    SaveOutlined,
    UploadOutlined,
} from "@ant-design/icons";

export default function GeneralSettingsPage() {
    const [form] = Form.useForm();

    const handleSave = () => {
        form.validateFields().then((values) => {
            console.log("Settings:", values);
            message.success("Settings saved successfully");
        });
    };

    const items = [
        {
            key: "general",
            label: "General",
            children: (
                <Form form={form} layout="vertical" style={{ maxWidth: 600 }}>
                    <Form.Item
                        name="siteName"
                        label="Site Name"
                        initialValue="Nusantarasoft"
                    >
                        <Input placeholder="My Website" />
                    </Form.Item>

                    <Form.Item
                        name="siteDescription"
                        label="Site Description"
                        initialValue="Powered by Nusantarasoft CMS"
                    >
                        <Input.TextArea rows={3} placeholder="Brief description of your site" />
                    </Form.Item>

                    <Form.Item name="siteLogo" label="Site Logo">
                        <Upload
                            listType="picture"
                            maxCount={1}
                            accept="image/*"
                        >
                            <Button icon={<UploadOutlined />}>Upload Logo</Button>
                        </Upload>
                    </Form.Item>

                    <Form.Item name="favicon" label="Favicon">
                        <Upload
                            listType="picture"
                            maxCount={1}
                            accept="image/*"
                        >
                            <Button icon={<UploadOutlined />}>Upload Favicon</Button>
                        </Upload>
                    </Form.Item>

                    <Divider />

                    <Form.Item
                        name="primaryColor"
                        label="Primary Color"
                        initialValue="#1677ff"
                    >
                        <ColorPicker />
                    </Form.Item>

                    <Form.Item
                        name="darkMode"
                        label="Enable Dark Mode"
                        valuePropName="checked"
                    >
                        <Switch />
                    </Form.Item>
                </Form>
            ),
        },
        {
            key: "seo",
            label: "SEO",
            children: (
                <Form layout="vertical" style={{ maxWidth: 600 }}>
                    <Form.Item
                        name="seoTitleTemplate"
                        label="Title Template"
                        initialValue="%s | Nusantarasoft"
                    >
                        <Input placeholder="%s | Site Name" />
                    </Form.Item>

                    <Form.Item
                        name="defaultMetaDescription"
                        label="Default Meta Description"
                    >
                        <Input.TextArea rows={3} placeholder="Default description for pages without custom meta" />
                    </Form.Item>

                    <Form.Item
                        name="googleAnalytics"
                        label="Google Analytics ID"
                    >
                        <Input placeholder="G-XXXXXXXXXX" />
                    </Form.Item>

                    <Form.Item
                        name="robotsTxt"
                        label="robots.txt"
                    >
                        <Input.TextArea
                            rows={5}
                            placeholder="User-agent: *&#10;Allow: /"
                            style={{ fontFamily: "monospace" }}
                        />
                    </Form.Item>
                </Form>
            ),
        },
        {
            key: "social",
            label: "Social Links",
            children: (
                <Form layout="vertical" style={{ maxWidth: 600 }}>
                    <Form.Item name="facebook" label="Facebook">
                        <Input placeholder="https://facebook.com/yourpage" />
                    </Form.Item>
                    <Form.Item name="twitter" label="Twitter/X">
                        <Input placeholder="https://twitter.com/yourhandle" />
                    </Form.Item>
                    <Form.Item name="instagram" label="Instagram">
                        <Input placeholder="https://instagram.com/yourhandle" />
                    </Form.Item>
                    <Form.Item name="linkedin" label="LinkedIn">
                        <Input placeholder="https://linkedin.com/company/yourcompany" />
                    </Form.Item>
                    <Form.Item name="youtube" label="YouTube">
                        <Input placeholder="https://youtube.com/@yourchannel" />
                    </Form.Item>
                </Form>
            ),
        },
    ];

    return (
        <CMSLayout
            title="Settings"
            subTitle="Configure your CMS"
            extra={[
                <Button
                    key="save"
                    type="primary"
                    icon={<SaveOutlined />}
                    onClick={handleSave}
                >
                    Save Changes
                </Button>,
            ]}
        >
            <Card>
                <Tabs items={items} />
            </Card>
        </CMSLayout>
    );
}
