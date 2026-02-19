"use client";

import React from "react";
import { Spin, Empty, Typography, Button } from "antd";
import {
    FilePdfOutlined,
    FileWordOutlined,
    FileExcelOutlined,
    FilePptOutlined,
    FileOutlined,
    FileUnknownOutlined,
    DownloadOutlined
} from "@ant-design/icons";
import DocViewer, { DocViewerRenderers, IDocument } from "@cyntler/react-doc-viewer";

const { Text } = Typography;

interface DocumentPreviewProps {
    url: string;
    filename: string;
    mimeType?: string;
}

// Custom Renderer for DOCX using docx-preview
const DOCXRenderer = ({ mainState: { currentDocument } }: any) => {
    const containerRef = React.useRef<HTMLDivElement>(null);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);

    React.useEffect(() => {
        if (!currentDocument || !currentDocument.uri) return;

        const loadDocx = async () => {
            setLoading(true);
            setError(null);
            try {
                // Check if uri is string
                if (typeof currentDocument.uri !== 'string') {
                    throw new Error("Invalid document URI");
                }

                const response = await fetch(currentDocument.uri);
                if (!response.ok) throw new Error(`Failed to fetch document: ${response.statusText}`);

                const blob = await response.blob();

                // Clear previous content
                if (containerRef.current) {
                    containerRef.current.innerHTML = '';
                }

                // Dynamic import to ensure client-side execution
                // @ts-ignore
                const docx = await import('docx-preview');

                if (containerRef.current) {
                    await docx.renderAsync(blob, containerRef.current, containerRef.current, {
                        className: "docx-viewer-wrapper",
                        inWrapper: true,
                        ignoreWidth: false,
                        ignoreHeight: false
                    });
                }

            } catch (err) {
                console.error("docx-preview error:", err);
                setError((err as Error).message);
            } finally {
                setLoading(false);
            }
        };

        loadDocx();
    }, [currentDocument]);

    if (loading) return <div className="p-10 text-center"><Spin tip="Rendering Word Document..." /></div>;

    if (error) return (
        <div className="p-10 text-center flex flex-col items-center justify-center h-full">
            <FileUnknownOutlined className="text-4xl text-red-400 mb-4" />
            <Text type="danger">Failed to render document</Text>
            <Text type="secondary" className="text-xs mt-2">{error}</Text>
        </div>
    );

    return (
        <div className="w-full h-full bg-[#F1F3F4] overflow-auto flex flex-col items-center py-8">
            <div
                ref={containerRef}
                className="w-full max-w-[850px]"
            />
            <style jsx global>{`
                /* Wrapper - Make it transparent so we see the gray container background */
                .docx-viewer-wrapper {
                    padding: 0 !important;
                    background: transparent !important;
                }
                
                /* Page Styling - FORCE WHITE BACKGROUND */
                .docx-viewer-wrapper section.docx,
                .docx-viewer-wrapper .docx {
                    background-color: #ffffff !important;
                    background-image: none !important; /* Ensure no background image overrides it */
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1), 0 8px 16px rgba(0, 0, 0, 0.1) !important;
                    margin-bottom: 24px !important;
                    padding: 48px !important; 
                    min-height: 1000px;
                    display: block; /* Ensure it behaves like a block */
                }

                /* Ensure text color is black just in case */
                .docx-viewer-wrapper {
                    color: black !important;
                }
            `}</style>
        </div>
    );
};

// Custom Renderer for XLSX using XLSX
const XLSXRenderer = ({ mainState: { currentDocument } }: any) => {
    const [html, setHtml] = React.useState<string>("");
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        if (!currentDocument || !currentDocument.uri) return;

        const loadXlsx = async () => {
            try {
                const XLSX = await import("xlsx");

                // Check if uri is string
                if (typeof currentDocument.uri !== 'string') {
                    throw new Error("Invalid document URI");
                }

                const response = await fetch(currentDocument.uri);
                if (!response.ok) throw new Error(`Failed to fetch spreadsheet: ${response.statusText}`);

                const arrayBuffer = await response.arrayBuffer();
                const workbook = XLSX.read(arrayBuffer, { type: 'array' });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const htmlData = XLSX.utils.sheet_to_html(firstSheet);
                setHtml(htmlData);
            } catch (err) {
                console.error("XLSX error:", err);
                setHtml(`<div class="p-4 text-red-500">Failed to render spreadsheet: ${(err as Error).message}</div>`);
            } finally {
                setLoading(false);
            }
        };

        loadXlsx();
    }, [currentDocument]);

    if (loading) return <div className="p-10 text-center"><Spin tip="Rendering Spreadsheet..." /></div>;

    return (
        <div className="w-full h-full p-4 bg-gray-100 overflow-auto">
            <div
                className="bg-white shadow-sm border border-gray-300 excel-table-preview inline-block min-w-full"
                dangerouslySetInnerHTML={{ __html: html }}
            />
            <style jsx global>{`
                .excel-table-preview table { border-collapse: collapse; font-family: sans-serif; font-size: 13px; }
                .excel-table-preview td { border: 1px solid #ccc; padding: 4px 8px; white-space: nowrap; }
                .excel-table-preview tr:nth-child(even) { background: #f9f9f9; }
            `}</style>
        </div>
    );
};

export function isDocumentPreviewable(filename?: string, mimeType?: string): boolean {
    if (!filename || typeof filename !== 'string') return false;
    const parts = filename.toLowerCase().split(".");
    const ext = parts.length > 1 ? parts.pop() : "";

    return ["pdf", "docx", "xlsx", "txt", "csv", "png", "jpg", "jpeg", "gif"].includes(ext || "");
}

export function getDocumentIcon(filename: string, mimeType?: string): React.ReactNode {
    if (!filename) return <FileOutlined style={{ fontSize: 48, color: "#8c8c8c" }} />;
    const parts = filename.toLowerCase().split(".");
    const ext = parts.length > 1 ? parts.pop() : "";

    if (ext === "pdf" || mimeType === "application/pdf") return <FilePdfOutlined style={{ fontSize: 48, color: "#ff4d4f" }} />;
    if (ext === "docx" || mimeType?.includes("word") || mimeType?.includes("docx")) return <FileWordOutlined style={{ fontSize: 48, color: "#1890ff" }} />;
    if (ext === "xlsx" || mimeType?.includes("sheet") || mimeType?.includes("excel")) return <FileExcelOutlined style={{ fontSize: 48, color: "#52c41a" }} />;
    if (["ppt", "pptx"].includes(ext || "")) return <FilePptOutlined style={{ fontSize: 48, color: "#fa8c16" }} />;
    return <FileOutlined style={{ fontSize: 48, color: "#8c8c8c" }} />;
}

export default function DocumentPreview({ url, filename, mimeType }: DocumentPreviewProps) {
    // Diagnostic logging
    React.useEffect(() => {
        console.log('[DocumentPreview] Rendering:', { hasUrl: !!url, filename, mimeType });
    }, [url, filename, mimeType]);

    if (!url || !filename) {
        return (
            <div className="flex flex-col items-center justify-center p-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                <FileUnknownOutlined style={{ fontSize: 48, color: '#bfbfbf', marginBottom: 16 }} />
                <Text type="secondary">{!url ? "No preview URL available" : "Missing filename"}</Text>
            </div>
        );
    }

    if (typeof url !== 'string' || typeof filename !== 'string') {
        console.error('[DocumentPreview] Invalid props:', { url, filename, mimeType });
        return (
            <div className="flex flex-col items-center justify-center p-12 bg-gray-50 rounded-lg border border-dashed border-red-300">
                <FileUnknownOutlined style={{ fontSize: 48, color: '#ff4d4f', marginBottom: 16 }} />
                <Text type="danger">Invalid file data for preview</Text>
            </div>
        );
    }

    const fileExtension = filename.split('.').pop()?.toLowerCase() || "";

    // Use manual renderers for DOCX and XLSX to avoid DocViewer crashes
    if (fileExtension === 'docx') {
        // Construct a mock "mainState" to reuse the renderer logic or just refactor the renderer to take props
        // To be safe and clean, we'll instantiate the renderer component directly with the document object
        return (
            <div style={{ height: '100%', border: "1px solid #f0f0f0", borderRadius: 8, overflow: "hidden", background: "#fff" }}>
                <DOCXRenderer mainState={{ currentDocument: { uri: url } }} />
            </div>
        );
    }

    if (fileExtension === 'xlsx') {
        return (
            <div style={{ height: '100%', border: "1px solid #f0f0f0", borderRadius: 8, overflow: "hidden", background: "#fff" }}>
                <XLSXRenderer mainState={{ currentDocument: { uri: url } }} />
            </div>
        );
    }

    // For other types, use DocViewer as fallback (e.g., pdf, png, etc.)
    const docs: IDocument[] = [
        {
            uri: url,
            fileName: filename,
            fileType: fileExtension
        }
    ];

    console.log('[DocumentPreview] Docs config (Fallback):', docs);

    return (
        <div style={{ height: '100%', border: "1px solid #f0f0f0", borderRadius: 8, overflow: "hidden", background: "#fff" }}>
            <DocViewer
                documents={docs}
                pluginRenderers={DocViewerRenderers}
                theme={{
                    primary: "#722ed1",
                    secondary: "#ffffff",
                    tertiary: "#f5f5f5",
                    textPrimary: "#000000",
                    textSecondary: "#8c8c8c",
                    textTertiary: "#fffff",
                    disableThemeScrollbar: false,
                }}
                config={{
                    header: {
                        disableHeader: true,
                        disableFileName: true,
                        retainURLParams: false
                    }
                }}
                style={{ height: '100%' }}
            />
        </div>
    );
}

