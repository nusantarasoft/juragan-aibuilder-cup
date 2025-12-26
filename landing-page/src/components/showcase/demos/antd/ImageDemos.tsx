"use client";

import React from "react";
import { Image, Space } from "antd";
import type { AntdComponentData } from "../../AntdStyleContent";

const sampleImage = "https://zos.alipayobjects.com/rmsportal/jkjgkEfvpUPVyRjUImniVslZfWPnJuuZ.png";
const fallbackImage = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMIAAADDCAYAAADQvc6UAAABRWlDQ1BJQ0MgUHJvZmlsZQAAKJFjYGASSSwoyGFhYGDIzSspCnJ3UoiIjFJgf8LAwSDCIMogwMCcmFxc4BgQ4ANUwgCjUcG3awyMIPqyLsis7PPOq3QdDFcvjV3jOD1boQVTPQrgSkktTgbSf4A4LbmgqISBgTEFyFYuLykAsTuAbJEioKOA7DkgdjqEvQHEToKwj4DVhAQ5A9k3gGyB5IxEoBmML4BsnSQk8XQkNtReEOBxcfXxUQg1Mjc0dyHgXNJBSWpFCYh2zi+oLMpMzyhRcASGUqqCZ16yno6CkYGRAQMDKMwhqj/fAIcloxgHQqxAjIHBEugw5sUIsSQpBobtQPdLciLEVJYzMPBHMDBsayhILEqEO4DxG0txmrERhM29nYGBddr//5/DGRjYNRkY/l7////39v///y4Dmn+LgesAWDRfPhQECTkAAAAldEVYdGRhdGU6Y3JlYXRlADIwMjEtMDctMTRUMTU6Mjc6NDArMDM6MDBXWIFZAAAAJXRFWHRkYXRlOm1vZGlmeQAyMDIxLTA3LTE0VDE1OjI3OjQwKzAzOjAwJgU54QAAAABJRU5ErkJggg==";

// Demo 1: Basic Image
const BasicImageDemo = () => (
    <Image width={200} src={sampleImage} />
);

// Demo 2: Image with Fallback
const FallbackImageDemo = () => (
    <Space>
        <Image width={100} src="error.png" fallback={fallbackImage} />
        <Image width={100} src={sampleImage} />
    </Space>
);

// Demo 3: Preview Group
const PreviewGroupDemo = () => (
    <Image.PreviewGroup>
        <Space>
            <Image width={100} src={sampleImage} />
            <Image width={100} src={sampleImage} />
            <Image width={100} src={sampleImage} />
        </Space>
    </Image.PreviewGroup>
);

// Demo 4: Custom Preview
const CustomPreviewDemo = () => (
    <Image
        width={200}
        src={sampleImage}
        preview={{
            src: sampleImage,
        }}
    />
);

// Demo 5: Placeholder
const PlaceholderDemo = () => (
    <Image
        width={200}
        placeholder={
            <div style={{
                width: 200,
                height: 200,
                background: "#f0f0f0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
            }}>
                Loading...
            </div>
        }
        src={sampleImage}
    />
);

// Demo 6: Preview Disabled
const DisabledPreviewDemo = () => (
    <Image width={200} src={sampleImage} preview={false} />
);

export const imageData: AntdComponentData = {
    id: "antd-image",
    name: "Image",
    description: "Image component with preview, fallback, and placeholder support. Enables zoom and pan interactions in preview mode.",
    whenToUse: "Use Image for product images, galleries, or any image that benefits from preview, fallback, or loading states.",
    docUrl: "https://ant.design/components/image",
    demos: [
        {
            id: "basic",
            title: "Basic Image",
            description: "Image with preview",
            demo: <BasicImageDemo />,
            code: `<Image width={200} src="image.png" />`,
        },
        {
            id: "fallback",
            title: "With Fallback",
            description: "Error fallback image",
            demo: <FallbackImageDemo />,
            code: `<Image src="error.png" fallback="fallback.png" />`,
        },
        {
            id: "group",
            title: "Preview Group",
            description: "Multiple image preview",
            demo: <PreviewGroupDemo />,
            code: `<Image.PreviewGroup>
  <Image src="1.png" />
  <Image src="2.png" />
</Image.PreviewGroup>`,
        },
        {
            id: "custom",
            title: "Custom Preview",
            description: "Custom preview options",
            demo: <CustomPreviewDemo />,
            code: `<Image preview={{ src: "large-image.png" }} />`,
        },
        {
            id: "placeholder",
            title: "Placeholder",
            description: "Loading placeholder",
            demo: <PlaceholderDemo />,
            code: `<Image placeholder={<div>Loading...</div>} />`,
        },
        {
            id: "disabled",
            title: "Preview Disabled",
            description: "No preview on click",
            demo: <DisabledPreviewDemo />,
            code: `<Image preview={false} />`,
        },
    ],
    apiProps: [
        { name: "src", type: "string", description: "Image source" },
        { name: "width", type: "number | string", description: "Image width" },
        { name: "height", type: "number | string", description: "Image height" },
        { name: "alt", type: "string", description: "Alt text" },
        { name: "fallback", type: "string", description: "Fallback image" },
        { name: "placeholder", type: "ReactNode", description: "Loading placeholder" },
        { name: "preview", type: "boolean | PreviewType", description: "Preview config", default: "true" },
        { name: "PreviewGroup", type: "Component", description: "Group for multiple images" },
    ],
};
