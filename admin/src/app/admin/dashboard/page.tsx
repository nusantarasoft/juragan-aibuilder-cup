"use client";

import React from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import { Card, Col, Row, Statistic } from "antd";
import {
    FileTextOutlined,
    PictureOutlined,
    TeamOutlined,
    EyeOutlined,
} from "@ant-design/icons";

export default function DashboardPage() {
    return (
        <CMSLayout title="Dashboard" subTitle="Overview of your CMS">
            <Row gutter={[16, 16]}>
                <Col xs={24} sm={12} lg={6}>
                    <Card>
                        <Statistic
                            title="Total Pages"
                            value={12}
                            prefix={<FileTextOutlined />}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card>
                        <Statistic
                            title="Media Files"
                            value={48}
                            prefix={<PictureOutlined />}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card>
                        <Statistic
                            title="Users"
                            value={5}
                            prefix={<TeamOutlined />}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card>
                        <Statistic
                            title="Page Views Today"
                            value={1254}
                            prefix={<EyeOutlined />}
                        />
                    </Card>
                </Col>
            </Row>

            <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
                <Col xs={24} lg={12}>
                    <Card title="Recent Pages" extra={<a href="/admin/pages/list">View All</a>}>
                        <p>No pages yet. Create your first page with the Page Builder.</p>
                    </Card>
                </Col>
                <Col xs={24} lg={12}>
                    <Card title="Quick Actions">
                        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                            <a href="/admin/pages/builder">Create New Page</a>
                            <a href="/admin/media">Upload Media</a>
                            <a href="/admin/users/list">Manage Users</a>
                        </div>
                    </Card>
                </Col>
            </Row>
        </CMSLayout>
    );
}
