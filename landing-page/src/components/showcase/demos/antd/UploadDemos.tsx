"use client";

import React from "react";
import { Upload, Button, message, Space } from "antd";
import type { UploadProps } from "antd";
import type { AntdComponentData } from "../../AntdStyleContent";

const { Dragger } = Upload;

const props: UploadProps = {
    name: "file",
    action: "https://660d2bd96ddfa2943b33731c.mockapi.io/api/upload",
    headers: { authorization: "authorization-text" },
    onChange(info) {
        if (info.file.status === "done") {
            message.success(`${info.file.name} uploaded successfully`);
        } else if (info.file.status === "error") {
            message.error(`${info.file.name} upload failed.`);
        }
    },
};

// Demo 1: Basic Upload
const BasicUploadDemo = () => (
    <Upload {...props}>
        <Button>📤 Click to Upload</Button>
    </Upload>
);

// Demo 2: File List
const FileListUploadDemo = () => (
    <Upload
        {...props}
        defaultFileList={[
            { uid: "1", name: "document.pdf", status: "done", url: "#" },
            { uid: "2", name: "image.png", status: "done", url: "#" },
        ]}
    >
        <Button>📤 Upload</Button>
    </Upload>
);

// Demo 3: Drag and Drop
const DraggerUploadDemo = () => (
    <Dragger {...props}>
        <p style={{ fontSize: 40, marginBottom: 8 }}>📁</p>
        <p style={{ fontSize: 16 }}>Click or drag file to upload</p>
        <p style={{ color: "#999" }}>Support for single or bulk upload</p>
    </Dragger>
);

// Demo 4: Picture Wall
const PictureWallDemo = () => (
    <Upload
        action="https://660d2bd96ddfa2943b33731c.mockapi.io/api/upload"
        listType="picture-card"
        defaultFileList={[
            { uid: "-1", name: "image.png", status: "done", url: "https://via.placeholder.com/100" },
        ]}
    >
        <div>➕ Upload</div>
    </Upload>
);

// Demo 5: Picture
const PictureUploadDemo = () => (
    <Upload
        {...props}
        listType="picture"
        defaultFileList={[
            { uid: "-1", name: "image.png", status: "done", url: "https://via.placeholder.com/50" },
        ]}
    >
        <Button>📷 Upload Picture</Button>
    </Upload>
);

// Demo 6: Directory
const DirectoryUploadDemo = () => (
    <Upload {...props} directory>
        <Button>📂 Upload Directory</Button>
    </Upload>
);

// Demo 7: Max Count
const MaxCountUploadDemo = () => (
    <Upload {...props} maxCount={3}>
        <Button>📤 Max 3 files</Button>
    </Upload>
);

// Demo 8: Disabled
const DisabledUploadDemo = () => (
    <Upload {...props} disabled>
        <Button disabled>📤 Disabled</Button>
    </Upload>
);

export const uploadData: AntdComponentData = {
    id: "antd-upload",
    name: "Upload",
    description: "Upload component for file uploads. Supports drag-and-drop, picture walls, directory upload, and file lists.",
    whenToUse: "Use Upload when users need to upload files, images, or directories to a server.",
    docUrl: "https://ant.design/components/upload",
    demos: [
        {
            id: "basic",
            title: "Basic Upload",
            description: "Click to upload",
            demo: <BasicUploadDemo />,
            code: `<Upload action="/api/upload">
  <Button>Click to Upload</Button>
</Upload>`,
        },
        {
            id: "filelist",
            title: "File List",
            description: "With default files",
            demo: <FileListUploadDemo />,
            code: `<Upload defaultFileList={[
  { uid: "1", name: "doc.pdf", status: "done" }
]}>
  <Button>Upload</Button>
</Upload>`,
        },
        {
            id: "dragger",
            title: "Drag and Drop",
            description: "Drag files to upload",
            demo: <DraggerUploadDemo />,
            code: `<Upload.Dragger>
  <p>Click or drag file to upload</p>
</Upload.Dragger>`,
        },
        {
            id: "picture-card",
            title: "Picture Wall",
            description: "Card-style image upload",
            demo: <PictureWallDemo />,
            code: `<Upload listType="picture-card">
  <div>➕ Upload</div>
</Upload>`,
        },
        {
            id: "picture",
            title: "Picture List",
            description: "List with thumbnails",
            demo: <PictureUploadDemo />,
            code: `<Upload listType="picture">
  <Button>Upload Picture</Button>
</Upload>`,
        },
        {
            id: "directory",
            title: "Directory Upload",
            description: "Upload entire folder",
            demo: <DirectoryUploadDemo />,
            code: `<Upload directory>
  <Button>Upload Directory</Button>
</Upload>`,
        },
        {
            id: "maxcount",
            title: "Max Count",
            description: "Limit file count",
            demo: <MaxCountUploadDemo />,
            code: `<Upload maxCount={3}>
  <Button>Max 3 files</Button>
</Upload>`,
        },
        {
            id: "disabled",
            title: "Disabled",
            description: "Non-interactive upload",
            demo: <DisabledUploadDemo />,
            code: `<Upload disabled>
  <Button disabled>Disabled</Button>
</Upload>`,
        },
    ],
    apiProps: [
        { name: "action", type: "string | (file) => Promise", description: "Upload URL" },
        { name: "name", type: "string", description: "File param name", default: "file" },
        { name: "headers", type: "object", description: "Request headers" },
        { name: "listType", type: "'text' | 'picture' | 'picture-card'", description: "List style" },
        { name: "fileList", type: "FileType[]", description: "Controlled file list" },
        { name: "defaultFileList", type: "FileType[]", description: "Default files" },
        { name: "multiple", type: "boolean", description: "Multiple files" },
        { name: "directory", type: "boolean", description: "Upload directory" },
        { name: "maxCount", type: "number", description: "Max file count" },
        { name: "disabled", type: "boolean", description: "Disable upload" },
        { name: "onChange", type: "(info) => void", description: "Status change callback" },
        { name: "beforeUpload", type: "(file, fileList) => boolean | Promise", description: "Pre-upload hook" },
    ],
};
