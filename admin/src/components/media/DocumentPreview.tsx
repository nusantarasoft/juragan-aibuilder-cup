"use client";

import React from "react";
import { Spin, Empty, Typography } from "antd";
import {
    FileTextOutlined,
    FilePdfOutlined,
    FileWordOutlined,
    FileExcelOutlined,
    FilePptOutlined,
    FileOutlined,
} from "@ant-design/icons";

const { Text } = Typography;

interface DocumentPreviewProps {
    url: string;
    filename: string;
    mimeType?: string;
}

// Supported document extensions
const SUPPORTED_EXTENSIONS = [
    ".pdf",
    ".doc",
    ".docx",
    ".xls",
    ".xlsx",
    ".ppt",
    ".pptx",
    ".txt",
    ".csv",
    ".json",
    ".xml",
    ".html",
    ".htm",
];

// Check if a file is a supported document type
export function isDocumentPreviewable(filename: string, mimeType?: string): boolean {
    const ext = filename.toLowerCase().split(".").pop();
    if (ext && SUPPORTED_EXTENSIONS.includes(`.${ext}`)) {
        return true;
    }
    // Check by MIME type
    if (mimeType) {
        const docMimeTypes = [
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/vnd.ms-powerpoint",
            "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            "text/plain",
            "text/csv",
            "application/json",
            "text/xml",
            "application/xml",
            "text/html",
        ];
        return docMimeTypes.includes(mimeType);
    }
    return false;
}

// Get icon for document type
export function getDocumentIcon(filename: string, mimeType?: string): React.ReactNode {
    const ext = filename.toLowerCase().split(".").pop();

    if (ext === "pdf" || mimeType === "application/pdf") {
        return <FilePdfOutlined style={{ fontSize: 48, color: "#ff4d4f" }} />;
    }
    if (["doc", "docx"].includes(ext || "") || mimeType?.includes("word")) {
        return <FileWordOutlined style={{ fontSize: 48, color: "#1890ff" }} />;
    }
    if (["xls", "xlsx"].includes(ext || "") || mimeType?.includes("excel") || mimeType?.includes("spreadsheet")) {
        return <FileExcelOutlined style={{ fontSize: 48, color: "#52c41a" }} />;
    }
    if (["ppt", "pptx"].includes(ext || "") || mimeType?.includes("powerpoint") || mimeType?.includes("presentation")) {
        return <FilePptOutlined style={{ fontSize: 48, color: "#fa8c16" }} />;
    }
    if (["txt", "csv", "json", "xml", "html", "htm"].includes(ext || "") || mimeType?.startsWith("text/")) {
        return <FileTextOutlined style={{ fontSize: 48, color: "#722ed1" }} />;
    }
    return <FileOutlined style={{ fontSize: 48, color: "#8c8c8c" }} />;
}

export default function DocumentPreview({ url, filename, mimeType }: DocumentPreviewProps) {
    const [error, setError] = React.useState<string | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [DocViewer, setDocViewer] = React.useState<any>(null);
    const [renderers, setRenderers] = React.useState<any>(null);

    // Load DocViewer and renderers on mount
    React.useEffect(() => {
        import("@cyntler/react-doc-viewer").then((mod) => {
            setDocViewer(() => mod.default);
            setRenderers(mod.DocViewerRenderers);
            setLoading(false);
        }).catch((err) => {
            console.error("Failed to load DocViewer:", err);
            setError("Failed to load document viewer");
            setLoading(false);
        });
    }, []);

    if (!isDocumentPreviewable(filename, mimeType)) {
        return (
            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    height: 400,
                    background: "linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)",
                    borderRadius: 8,
                }}
            >
                {getDocumentIcon(filename, mimeType)}
                <Text style={{ marginTop: 16 }}>Preview not available for this file type</Text>
            </div>
        );
    }

    if (loading) {
        return (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 400 }}>
                <Spin size="large" />
            </div>
        );
    }

    if (error || !DocViewer) {
        return (
            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    height: 400,
                    background: "#fff1f0",
                    borderRadius: 8,
                }}
            >
                <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={
                        <span>
                            <Text type="danger">Failed to load document</Text>
                            <br />
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                {error || "Document viewer not available"}
                            </Text>
                        </span>
                    }
                />
            </div>
        );
    }

    const documents = [{ uri: url, fileName: filename }];

    return (
        <div
            style={{
                height: 500,
                borderRadius: 8,
                overflow: "hidden",
                border: "1px solid rgba(139, 92, 246, 0.2)",
            }}
        >
            <DocViewer
                documents={documents}
                pluginRenderers={renderers}
                config={{
                    header: {
                        disableHeader: true,
                        disableFileName: true,
                    },
                    pdfVerticalScrollByDefault: true,
                }}
                style={{ height: "100%" }}
                onDocumentLoadError={(err: any) => {
                    console.error("Document load error:", err);
                    setError(err?.message || "Unknown error");
                }}
            />
        </div>
    );
}
