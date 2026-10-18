"use client";

import React from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import { Card, Button, Space, Tag, Typography } from "antd";
import {
  ExportOutlined,
  PictureOutlined,
  QrcodeOutlined,
  ReloadOutlined,
  ShareAltOutlined,
} from "@ant-design/icons";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";

const { Text } = Typography;

const GALLERY_URL =
  process.env.NEXT_PUBLIC_GALLERY_URL || "http://localhost:3004";

export default function AdminTenantBrochuresPage() {
  const { themeColor } = usePreferencesStore();

  return (
    <CMSLayout
      title={
        <AuroraText colors={[themeColor, "#38bdf8", "#22c55e"]}>
          Tenant Brochures Vault
        </AuroraText>
      }
      subTitle={
        <DecryptedText
          text="Interactive multi-tenant brochure gallery, QR booth generator & omni-channel share studio"
          animateOn="view"
          revealDirection="center"
          speed={40}
          maxIterations={15}
          sequential
        />
      }
      extra={[
        <Button
          key="open"
          type="primary"
          icon={<ExportOutlined />}
          onClick={() => window.open(GALLERY_URL, "_blank")}
          style={{ background: themeColor, borderColor: themeColor }}
        >
          Open Brochure Gallery (:3004)
        </Button>,
        <Button
          key="refresh"
          icon={<ReloadOutlined />}
          onClick={() => window.location.reload()}
        />,
      ]}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Card size="small">
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <Space size={10} wrap>
              <Tag color="orange">
                <PictureOutlined /> PORT 3004 CONTAINER
              </Tag>
              <Tag color="cyan">
                <ShareAltOutlined /> OMNI-CHANNEL SHARE STUDIO
              </Tag>
              <Tag color="green">
                <QrcodeOutlined /> SUPABASE + MINIO S3 SYNCED
              </Tag>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Live embedded view of the public{" "}
                <Text code>brochure-gallery</Text> Next.js frontend container.
              </Text>
            </Space>
            <Button
              size="small"
              icon={<ExportOutlined />}
              onClick={() => window.open(GALLERY_URL, "_blank")}
            >
              Launch Standalone Surface
            </Button>
          </div>
        </Card>

        <div
          style={{
            width: "100%",
            height: "calc(100vh - 210px)",
            minHeight: 680,
            border: "1px solid rgba(251, 146, 60, 0.35)",
            background: "#0b0e13",
          }}
        >
          <iframe
            src={GALLERY_URL}
            title="Nusantarasoft Tenant Brochure Gallery"
            style={{ width: "100%", height: "100%", border: "none" }}
          />
        </div>
      </div>
    </CMSLayout>
  );
}
