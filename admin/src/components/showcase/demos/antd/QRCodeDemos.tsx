"use client";

import React from "react";
import { QRCode, Space, Input } from "antd";
import type { AntdComponentData } from "../../AntdStyleContent";

// Demo 1: Basic QRCode
const BasicQRCodeDemo = () => (
    <QRCode value="https://ant.design" />
);

// Demo 2: With Icon
const IconQRCodeDemo = () => (
    <QRCode
        value="https://ant.design"
        icon="https://gw.alipayobjects.com/zos/rmsportal/KDpgvguMpGfqaHPjicRK.svg"
    />
);

// Demo 3: Different Sizes
const SizesQRCodeDemo = () => (
    <Space>
        <QRCode value="https://ant.design" size={80} />
        <QRCode value="https://ant.design" size={120} />
        <QRCode value="https://ant.design" size={160} />
    </Space>
);

// Demo 4: Status
const StatusQRCodeDemo = () => (
    <Space>
        <QRCode value="https://ant.design" status="loading" />
        <QRCode value="https://ant.design" status="expired" onRefresh={() => console.log("refresh")} />
    </Space>
);

// Demo 5: Custom Colors
const ColorsQRCodeDemo = () => (
    <Space>
        <QRCode value="https://ant.design" color="#1677ff" />
        <QRCode value="https://ant.design" color="#52c41a" bgColor="#f0f0f0" />
    </Space>
);

// Demo 6: Bordered
const BorderedQRCodeDemo = () => (
    <Space>
        <QRCode value="https://ant.design" bordered />
        <QRCode value="https://ant.design" bordered={false} />
    </Space>
);

// Demo 7: Error Level
const ErrorLevelDemo = () => (
    <Space>
        <QRCode value="https://ant.design" errorLevel="L" />
        <QRCode value="https://ant.design" errorLevel="H" />
    </Space>
);

export const qrCodeData: AntdComponentData = {
    id: "antd-qrcode",
    name: "QRCode",
    description: "QRCode generates a scannable QR code from a value. Supports icons, colors, sizes, and various error correction levels.",
    whenToUse: "Use QRCode for sharing URLs, app downloads, payment codes, or any data that needs to be scanned.",
    docUrl: "https://ant.design/components/qr-code",
    demos: [
        {
            id: "basic",
            title: "Basic QRCode",
            description: "Simple QR code",
            demo: <BasicQRCodeDemo />,
            code: `<QRCode value="https://ant.design" />`,
        },
        {
            id: "icon",
            title: "With Icon",
            description: "Center logo",
            demo: <IconQRCodeDemo />,
            code: `<QRCode value="url" icon="logo.svg" />`,
        },
        {
            id: "sizes",
            title: "Sizes",
            description: "Different dimensions",
            demo: <SizesQRCodeDemo />,
            code: `<QRCode value="url" size={80} />
<QRCode value="url" size={120} />`,
        },
        {
            id: "status",
            title: "Status",
            description: "Loading and expired",
            demo: <StatusQRCodeDemo />,
            code: `<QRCode status="loading" />
<QRCode status="expired" onRefresh={refresh} />`,
        },
        {
            id: "colors",
            title: "Custom Colors",
            description: "Color and background",
            demo: <ColorsQRCodeDemo />,
            code: `<QRCode color="#1677ff" bgColor="#f0f0f0" />`,
        },
        {
            id: "bordered",
            title: "Bordered",
            description: "With/without border",
            demo: <BorderedQRCodeDemo />,
            code: `<QRCode bordered />
<QRCode bordered={false} />`,
        },
        {
            id: "error",
            title: "Error Level",
            description: "Correction levels",
            demo: <ErrorLevelDemo />,
            code: `<QRCode errorLevel="L" />
<QRCode errorLevel="H" />`,
        },
    ],
    apiProps: [
        { name: "value", type: "string", description: "QR code content", required: true },
        { name: "size", type: "number", description: "Code size (px)", default: "160" },
        { name: "icon", type: "string", description: "Center icon URL" },
        { name: "iconSize", type: "number", description: "Icon size", default: "40" },
        { name: "color", type: "string", description: "Code color", default: "#000" },
        { name: "bgColor", type: "string", description: "Background color", default: "#fff" },
        { name: "bordered", type: "boolean", description: "Show border", default: "true" },
        { name: "errorLevel", type: "'L' | 'M' | 'Q' | 'H'", description: "Error correction", default: "M" },
        { name: "status", type: "'active' | 'expired' | 'loading'", description: "QR status" },
        { name: "onRefresh", type: "() => void", description: "Refresh callback" },
    ],
};
