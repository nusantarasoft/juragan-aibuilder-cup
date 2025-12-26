"use client";

import React from "react";
import { Space, Typography } from "antd";
import type { AntdComponentData } from "../../AntdStyleContent";

const { Text, Title } = Typography;

// Helper for icon display
const IconBox = ({ color, label }: { color: string; label: string }) => (
    <div style={{ textAlign: "center" }}>
        <div style={{
            width: 48, height: 48, borderRadius: 8,
            background: color, color: "white",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 24, marginBottom: 4
        }}>
            {label}
        </div>
        <Text type="secondary" style={{ fontSize: 12 }}>{label}</Text>
    </div>
);

// Demo 1: Outlined Icons
const OutlinedIconsDemo = () => (
    <Space size="large" wrap>
        <IconBox color="#1890ff" label="🏠" />
        <IconBox color="#52c41a" label="✓" />
        <IconBox color="#faad14" label="⚙️" />
        <IconBox color="#722ed1" label="👤" />
        <IconBox color="#eb2f96" label="❤️" />
    </Space>
);

// Demo 2: Filled Icons
const FilledIconsDemo = () => (
    <Space size="large" wrap>
        <IconBox color="#1890ff" label="📁" />
        <IconBox color="#52c41a" label="📧" />
        <IconBox color="#faad14" label="🔔" />
        <IconBox color="#722ed1" label="📷" />
        <IconBox color="#eb2f96" label="🎵" />
    </Space>
);

// Demo 3: Two-Tone Icons
const TwoToneIconsDemo = () => (
    <Space size="large" wrap>
        <IconBox color="linear-gradient(135deg, #1890ff, #69c0ff)" label="🔒" />
        <IconBox color="linear-gradient(135deg, #52c41a, #95de64)" label="✅" />
        <IconBox color="linear-gradient(135deg, #faad14, #ffc53d)" label="⭐" />
        <IconBox color="linear-gradient(135deg, #f5222d, #ff7875)" label="💔" />
    </Space>
);

// Demo 4: Icon Sizes
const IconSizesDemo = () => (
    <Space size="large" align="end">
        <div style={{ fontSize: 16, color: "#1890ff" }}>🏠 16px</div>
        <div style={{ fontSize: 24, color: "#1890ff" }}>🏠 24px</div>
        <div style={{ fontSize: 32, color: "#1890ff" }}>🏠 32px</div>
        <div style={{ fontSize: 48, color: "#1890ff" }}>🏠 48px</div>
    </Space>
);

// Demo 5: Icon Colors
const IconColorsDemo = () => (
    <Space size="large">
        <span style={{ fontSize: 32, color: "#1890ff" }}>💙</span>
        <span style={{ fontSize: 32, color: "#52c41a" }}>💚</span>
        <span style={{ fontSize: 32, color: "#faad14" }}>💛</span>
        <span style={{ fontSize: 32, color: "#f5222d" }}>❤️</span>
        <span style={{ fontSize: 32, color: "#722ed1" }}>💜</span>
    </Space>
);

// Demo 6: Rotating/Spinning
const SpinningIconsDemo = () => (
    <Space size="large">
        <span style={{ fontSize: 32, display: "inline-block", animation: "spin 2s linear infinite" }}>⚙️</span>
        <span style={{ fontSize: 32, display: "inline-block", animation: "spin 1s linear infinite" }}>🔄</span>
        <span style={{ fontSize: 32, display: "inline-block", animation: "spin 3s linear infinite" }}>☀️</span>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </Space>
);

export const iconData: AntdComponentData = {
    id: "antd-icon",
    name: "Icon",
    description: "Ant Design provides a comprehensive icon library with outlined, filled, and two-tone styles. Icons can be customized with colors and sizes.",
    whenToUse: "Use Icon to add visual indicators, navigation aids, or decorative elements. Available in three styles: outlined, filled, and two-tone.",
    docUrl: "https://ant.design/components/icon",
    demos: [
        {
            id: "outlined",
            title: "Outlined Icons",
            description: "Default outlined style",
            demo: <OutlinedIconsDemo />,
            code: `import { HomeOutlined, CheckOutlined, SettingOutlined } from '@ant-design/icons';

<HomeOutlined />
<CheckOutlined />
<SettingOutlined />`,
        },
        {
            id: "filled",
            title: "Filled Icons",
            description: "Solid filled icons",
            demo: <FilledIconsDemo />,
            code: `import { FolderFilled, MailFilled, BellFilled } from '@ant-design/icons';

<FolderFilled />
<MailFilled />
<BellFilled />`,
        },
        {
            id: "twotone",
            title: "Two-Tone Icons",
            description: "Two-color icons",
            demo: <TwoToneIconsDemo />,
            code: `import { LockTwoTone, CheckCircleTwoTone, StarTwoTone } from '@ant-design/icons';

<LockTwoTone twoToneColor="#1890ff" />
<CheckCircleTwoTone twoToneColor="#52c41a" />`,
        },
        {
            id: "sizes",
            title: "Icon Sizes",
            description: "Different sizes via fontSize",
            demo: <IconSizesDemo />,
            code: `<HomeOutlined style={{ fontSize: 16 }} />
<HomeOutlined style={{ fontSize: 24 }} />
<HomeOutlined style={{ fontSize: 32 }} />
<HomeOutlined style={{ fontSize: 48 }} />`,
        },
        {
            id: "colors",
            title: "Icon Colors",
            description: "Custom colors",
            demo: <IconColorsDemo />,
            code: `<HeartFilled style={{ color: '#eb2f96' }} />
<CheckCircleFilled style={{ color: '#52c41a' }} />`,
        },
        {
            id: "spin",
            title: "Spinning Icons",
            description: "Animated rotation",
            demo: <SpinningIconsDemo />,
            code: `<LoadingOutlined spin />
<SyncOutlined spin />`,
        },
    ],
    apiProps: [
        { name: "spin", type: "boolean", description: "Rotate icon animation" },
        { name: "rotate", type: "number", description: "Rotate by angle" },
        { name: "twoToneColor", type: "string", description: "Two-tone color" },
        { name: "style", type: "CSSProperties", description: "Custom styles (fontSize, color)" },
        { name: "className", type: "string", description: "CSS class name" },
    ],
};
