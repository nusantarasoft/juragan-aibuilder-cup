"use client";

import React, { useState, useRef, useCallback } from "react";
import {
  Button, Modal, Upload, Table, Select, Tag, Progress, Space,
  Tooltip, message, Typography, Divider, Alert, Input, Tabs,
} from "antd";
import {
  ImportOutlined, ExportOutlined, CloudUploadOutlined,
  FileExcelOutlined, FileTextOutlined, DownloadOutlined,
  CheckCircleOutlined, CloseCircleOutlined, SwapOutlined,
  DatabaseOutlined, CopyOutlined, InboxOutlined,
} from "@ant-design/icons";
import type { FormInstance } from "antd";

const { Text, Title } = Typography;
const { Dragger } = Upload;

export interface FieldDef {
  name: string;
  label: string;
  required?: boolean;
  type?: "string" | "number" | "boolean" | "date" | "array" | "json";
}

interface DataImportExportProps {
  form: FormInstance;
  entityName: string;
  fields: FieldDef[];
  onBatchCreate?: (records: any[]) => Promise<{ success: number; failed: number; errors?: string[] }>;
  onAfterImport?: () => void;
  gradient?: [string, string];
}

// ─── Helpers ────────────────────────────────────────
function camelToSnake(s: string) { return s.replace(/[A-Z]/g, m => "_" + m.toLowerCase()); }
function snakeToCamel(s: string) { return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase()); }
function normalizeKey(s: string) { return s.toLowerCase().replace(/[\s_\-]+/g, ""); }

function autoMatchColumns(sourceHeaders: string[], targetFields: FieldDef[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  for (const header of sourceHeaders) {
    const normalizedH = normalizeKey(header);
    const camelH = snakeToCamel(header);
    const snakeH = camelToSnake(header);
    let matched = false;
    for (const f of targetFields) {
      const normalizedF = normalizeKey(f.name);
      const normalizedLabel = normalizeKey(f.label);
      if (
        normalizedH === normalizedF ||
        normalizedH === normalizedLabel ||
        camelH === f.name ||
        snakeH === camelToSnake(f.name) ||
        header.toLowerCase() === f.name.toLowerCase() ||
        header.toLowerCase() === f.label.toLowerCase()
      ) {
        mapping[header] = f.name;
        matched = true;
        break;
      }
    }
    if (!matched) mapping[header] = "__skip__";
  }
  return mapping;
}

function applyMapping(row: Record<string, any>, mapping: Record<string, string>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [srcKey, targetKey] of Object.entries(mapping)) {
    if (targetKey === "__skip__" || !targetKey) continue;
    result[targetKey] = row[srcKey];
  }
  return result;
}

async function parseFile(file: File): Promise<{ headers: string[]; rows: Record<string, any>[] }> {
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "json") {
    const text = await file.text();
    const parsed = JSON.parse(text);
    const arr = Array.isArray(parsed) ? parsed : [parsed];
    if (arr.length === 0) return { headers: [], rows: [] };
    return { headers: Object.keys(arr[0]), rows: arr };
  }
  // CSV or XLS/XLSX
  const XLSX = await import("xlsx");
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: "" });
  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
  return { headers, rows };
}

// ─── Component ──────────────────────────────────────
export default function DataImportExport({
  form, entityName, fields, onBatchCreate, onAfterImport, gradient,
}: DataImportExportProps) {
  const g1 = gradient?.[0] || "#6366f1";
  const g2 = gradient?.[1] || "var(--theme-color, #8b5cf6)";

  // Import modal
  const [importOpen, setImportOpen] = useState(false);
  const [importStep, setImportStep] = useState<"upload" | "mapping" | "done">("upload");
  const [importHeaders, setImportHeaders] = useState<string[]>([]);
  const [importRows, setImportRows] = useState<Record<string, any>[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [jsonPaste, setJsonPaste] = useState("");

  // Batch import modal
  const [batchOpen, setBatchOpen] = useState(false);
  const [batchStep, setBatchStep] = useState<"upload" | "mapping" | "preview" | "progress" | "done">("upload");
  const [batchHeaders, setBatchHeaders] = useState<string[]>([]);
  const [batchRows, setBatchRows] = useState<Record<string, any>[]>([]);
  const [batchMapping, setBatchMapping] = useState<Record<string, string>>({});
  const [batchProgress, setBatchProgress] = useState({ total: 0, done: 0, success: 0, failed: 0, errors: [] as string[] });

  // ═══ IMPORT (single record) ═══
  const handleImportFile = async (file: File) => {
    try {
      const { headers, rows } = await parseFile(file);
      if (rows.length === 0) { message.warning("File is empty"); return; }
      setImportHeaders(headers);
      setImportRows(rows);
      const mapping = autoMatchColumns(headers, fields);
      setColumnMapping(mapping);
      const autoMatched = Object.values(mapping).filter(v => v !== "__skip__").length;
      if (autoMatched === headers.length) {
        // All matched, apply directly
        form.setFieldsValue(applyMapping(rows[0], mapping));
        message.success(`Imported ${autoMatched} fields from ${file.name}`);
        setImportOpen(false);
        onAfterImport?.();
      } else {
        setImportStep("mapping");
      }
    } catch (e: any) {
      message.error(`Failed to parse file: ${e.message}`);
    }
  };

  const handleJsonPaste = () => {
    try {
      const parsed = JSON.parse(jsonPaste);
      const obj = Array.isArray(parsed) ? parsed[0] : parsed;
      const headers = Object.keys(obj);
      setImportHeaders(headers);
      setImportRows([obj]);
      const mapping = autoMatchColumns(headers, fields);
      setColumnMapping(mapping);
      const autoMatched = Object.values(mapping).filter(v => v !== "__skip__").length;
      if (autoMatched === headers.length) {
        form.setFieldsValue(applyMapping(obj, mapping));
        message.success(`Imported ${autoMatched} fields`);
        setImportOpen(false);
        onAfterImport?.();
      } else {
        setImportStep("mapping");
      }
    } catch (e: any) {
      message.error(`Invalid JSON: ${e.message}`);
    }
  };

  const applyImportMapping = () => {
    const mapped = applyMapping(importRows[0], columnMapping);
    form.setFieldsValue(mapped);
    const count = Object.values(columnMapping).filter(v => v !== "__skip__").length;
    message.success(`Mapped ${count} fields into form`);
    setImportOpen(false);
    setImportStep("upload");
    onAfterImport?.();
  };

  const resetImport = () => {
    setImportOpen(false);
    setImportStep("upload");
    setImportHeaders([]);
    setImportRows([]);
    setColumnMapping({});
    setJsonPaste("");
  };

  // ═══ EXPORT ═══
  const handleExport = () => {
    const values = form.getFieldsValue();
    const clean: Record<string, any> = {};
    for (const [k, v] of Object.entries(values)) {
      if (v !== undefined && v !== null && v !== "") clean[k] = v;
    }
    const json = JSON.stringify(clean, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${entityName}_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    message.success("Exported to JSON");
  };

  // ═══ TEMPLATE ═══
  const handleDownloadTemplate = (format: "json" | "csv") => {
    if (format === "json") {
      const template: Record<string, any> = {};
      fields.forEach(f => {
        template[f.name] = f.type === "number" ? 0 : f.type === "boolean" ? false : f.type === "array" ? [] : "";
      });
      const json = JSON.stringify([template], null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${entityName}_template.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const headers = fields.map(f => f.name).join(",");
      const blob = new Blob([headers + "\n"], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${entityName}_template.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
    message.success(`Downloaded ${format.toUpperCase()} template`);
  };

  // ═══ BATCH IMPORT ═══
  const handleBatchFile = async (file: File) => {
    try {
      const { headers, rows } = await parseFile(file);
      if (rows.length === 0) { message.warning("File is empty"); return; }
      setBatchHeaders(headers);
      setBatchRows(rows);
      const mapping = autoMatchColumns(headers, fields);
      setBatchMapping(mapping);
      const autoMatched = Object.values(mapping).filter(v => v !== "__skip__").length;
      if (autoMatched === headers.length) {
        setBatchStep("preview");
      } else {
        setBatchStep("mapping");
      }
    } catch (e: any) {
      message.error(`Failed to parse file: ${e.message}`);
    }
  };

  const applyBatchMapping = () => setBatchStep("preview");

  const executeBatchImport = async () => {
    if (!onBatchCreate) return;
    setBatchStep("progress");
    const mappedRows = batchRows.map(r => applyMapping(r, batchMapping));
    setBatchProgress({ total: mappedRows.length, done: 0, success: 0, failed: 0, errors: [] });
    const result = await onBatchCreate(mappedRows);
    setBatchProgress({
      total: mappedRows.length,
      done: mappedRows.length,
      success: result.success,
      failed: result.failed,
      errors: result.errors || [],
    });
    setBatchStep("done");
  };

  const resetBatch = () => {
    setBatchOpen(false);
    setBatchStep("upload");
    setBatchHeaders([]);
    setBatchRows([]);
    setBatchMapping({});
    setBatchProgress({ total: 0, done: 0, success: 0, failed: 0, errors: [] });
  };

  // ─── Mapping Table ─────────────────────────────────
  const renderMappingTable = (
    headers: string[],
    mapping: Record<string, string>,
    setMapping: (m: Record<string, string>) => void,
    rows: Record<string, any>[],
  ) => {
    const autoMatched = Object.values(mapping).filter(v => v !== "__skip__").length;
    return (
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <Text strong className="text-sm">Map Source Columns → Form Fields</Text>
            <div>
              <Tag color={autoMatched === headers.length ? "green" : "orange"} className="rounded-full mt-1">
                {autoMatched}/{headers.length} auto-matched
              </Tag>
            </div>
          </div>
          <Button size="small" onClick={() => setMapping(autoMatchColumns(headers, fields))}>
            Reset Mapping
          </Button>
        </div>
        <div style={{
          maxHeight: 350, overflowY: "auto",
          border: "1px solid #f0f0f0", borderRadius: 10, padding: 12,
          background: "#fafafa",
        }}>
          {headers.map((h, i) => (
            <div key={i} className="flex items-center gap-2 mb-2" style={{ minHeight: 36 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Tag className="rounded text-xs truncate" style={{ maxWidth: "100%" }}>{h}</Tag>
                {rows[0] && (
                  <Text type="secondary" className="text-xs block truncate" style={{ maxWidth: 160 }}>
                    {String(rows[0][h] ?? "").slice(0, 40)}
                  </Text>
                )}
              </div>
              <SwapOutlined className="text-gray-400" style={{ fontSize: 12 }} />
              <Select
                size="small"
                value={mapping[h] || "__skip__"}
                onChange={(v) => setMapping({ ...mapping, [h]: v })}
                style={{ width: 180 }}
                options={[
                  { value: "__skip__", label: <Text type="secondary" className="text-xs">⏭ (skip)</Text> },
                  ...fields.map(f => ({
                    value: f.name,
                    label: <span className="text-xs">{f.required ? "* " : ""}{f.label}</span>,
                  })),
                ]}
              />
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ─── Render ────────────────────────────────────────
  return (
    <>
      {/* Toolbar */}
      <div style={{
        display: "flex", gap: 6, flexWrap: "wrap",
        padding: "8px 0",
        borderBottom: "1px solid #f0f0f0",
        marginBottom: 12,
      }}>
        <Tooltip title="Import from JSON, CSV, or Excel">
          <Button size="small" icon={<ImportOutlined />}
            onClick={() => { resetImport(); setImportOpen(true); }}
            style={{ borderRadius: 6, fontSize: 12 }}>
            Import
          </Button>
        </Tooltip>
        <Tooltip title="Export current form data as JSON">
          <Button size="small" icon={<ExportOutlined />}
            onClick={handleExport}
            style={{ borderRadius: 6, fontSize: 12 }}>
            Export
          </Button>
        </Tooltip>
        {onBatchCreate && (
          <Tooltip title="Batch import multiple records from file">
            <Button size="small" icon={<DatabaseOutlined />}
              onClick={() => { resetBatch(); setBatchOpen(true); }}
              style={{ borderRadius: 6, fontSize: 12 }}>
              Batch Import
            </Button>
          </Tooltip>
        )}
        <Tooltip title="Download empty template">
          <Button size="small" icon={<DownloadOutlined />}
            onClick={() => handleDownloadTemplate("json")}
            style={{ borderRadius: 6, fontSize: 12 }}>
            Template
          </Button>
        </Tooltip>
      </div>

      {/* ═══ Import Modal ═══ */}
      <Modal
        title={null}
        open={importOpen}
        onCancel={resetImport}
        footer={null}
        width={560}
        centered
        styles={{ body: { padding: 0 } }}
      >
        <div style={{ padding: "20px 24px 12px" }}>
          <Title level={5} className="!m-0" style={{ background: `linear-gradient(135deg, ${g1}, ${g2})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            📥 Import {entityName}
          </Title>
          <Text type="secondary" className="text-xs">Fill the form from a JSON, CSV, or Excel file</Text>
        </div>

        <div style={{ padding: "12px 24px 20px" }}>
          {importStep === "upload" && (
            <Tabs
              size="small"
              items={[
                {
                  key: "file",
                  label: <span><CloudUploadOutlined /> Upload File</span>,
                  children: (
                    <Dragger
                      accept=".json,.csv,.xlsx,.xls"
                      showUploadList={false}
                      customRequest={({ file }) => handleImportFile(file as File)}
                      style={{ borderRadius: 10, border: `2px dashed ${g1}30`, background: `${g1}05` }}
                    >
                      <p className="text-3xl" style={{ color: g1 }}><InboxOutlined /></p>
                      <p className="text-sm font-medium">Drop file here or click to browse</p>
                      <p className="text-xs text-gray-400">Supports JSON, CSV, XLS, XLSX</p>
                    </Dragger>
                  ),
                },
                {
                  key: "paste",
                  label: <span><CopyOutlined /> Paste JSON</span>,
                  children: (
                    <div>
                      <Input.TextArea
                        rows={8}
                        placeholder={'{\n  "name": "Example",\n  "email": "test@example.com"\n}'}
                        value={jsonPaste}
                        onChange={e => setJsonPaste(e.target.value)}
                        style={{ borderRadius: 10, fontFamily: "monospace", fontSize: 12 }}
                      />
                      <Button
                        type="primary"
                        size="small"
                        onClick={handleJsonPaste}
                        disabled={!jsonPaste.trim()}
                        style={{ marginTop: 10, borderRadius: 6, background: `linear-gradient(135deg, ${g1}, ${g2})`, border: "none" }}
                      >
                        Parse & Import
                      </Button>
                    </div>
                  ),
                },
              ]}
            />
          )}

          {importStep === "mapping" && (
            <>
              {renderMappingTable(importHeaders, columnMapping, setColumnMapping, importRows)}
              <div className="flex justify-end gap-2 mt-4">
                <Button size="small" onClick={() => setImportStep("upload")} style={{ borderRadius: 6 }}>Back</Button>
                <Button type="primary" size="small" onClick={applyImportMapping}
                  style={{ borderRadius: 6, background: `linear-gradient(135deg, ${g1}, ${g2})`, border: "none" }}
                  icon={<CheckCircleOutlined />}>
                  Apply Mapping
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* ═══ Batch Import Modal ═══ */}
      <Modal
        title={null}
        open={batchOpen}
        onCancel={resetBatch}
        footer={null}
        width={700}
        centered
        styles={{ body: { padding: 0 } }}
      >
        <div style={{ padding: "20px 24px 12px" }}>
          <Title level={5} className="!m-0" style={{ background: `linear-gradient(135deg, ${g1}, ${g2})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            📦 Batch Import {entityName}
          </Title>
          <Text type="secondary" className="text-xs">
            {batchStep === "upload" && "Upload a file with multiple records"}
            {batchStep === "mapping" && "Map your file columns to form fields"}
            {batchStep === "preview" && `${batchRows.length} records ready to import`}
            {batchStep === "progress" && "Importing records..."}
            {batchStep === "done" && "Import complete"}
          </Text>
        </div>

        <div style={{ padding: "12px 24px 20px" }}>
          {batchStep === "upload" && (
            <Dragger
              accept=".json,.csv,.xlsx,.xls"
              showUploadList={false}
              customRequest={({ file }) => handleBatchFile(file as File)}
              style={{ borderRadius: 10, border: `2px dashed ${g1}30`, background: `${g1}05` }}
            >
              <p className="text-3xl" style={{ color: g1 }}><InboxOutlined /></p>
              <p className="text-sm font-medium">Drop file with multiple records</p>
              <p className="text-xs text-gray-400">JSON array, CSV, or Excel with rows</p>
            </Dragger>
          )}

          {batchStep === "mapping" && (
            <>
              {renderMappingTable(batchHeaders, batchMapping, setBatchMapping, batchRows)}
              <div className="flex justify-end gap-2 mt-4">
                <Button size="small" onClick={() => setBatchStep("upload")} style={{ borderRadius: 6 }}>Back</Button>
                <Button type="primary" size="small" onClick={applyBatchMapping}
                  style={{ borderRadius: 6, background: `linear-gradient(135deg, ${g1}, ${g2})`, border: "none" }}>
                  Continue to Preview →
                </Button>
              </div>
            </>
          )}

          {batchStep === "preview" && (
            <>
              <Alert
                message={`${batchRows.length} records parsed • ${Object.values(batchMapping).filter(v => v !== "__skip__").length} fields mapped`}
                type="info" showIcon style={{ borderRadius: 8, marginBottom: 12 }}
              />
              <div style={{ maxHeight: 300, overflowY: "auto", border: "1px solid #f0f0f0", borderRadius: 10 }}>
                <Table
                  size="small"
                  dataSource={batchRows.slice(0, 50).map((r, i) => ({ ...applyMapping(r, batchMapping), _key: i }))}
                  rowKey="_key"
                  columns={fields.filter(f => Object.values(batchMapping).includes(f.name)).slice(0, 6).map(f => ({
                    title: f.label,
                    dataIndex: f.name,
                    ellipsis: true,
                    width: 120,
                    render: (v: any) => <Text className="text-xs">{String(v ?? "—").slice(0, 30)}</Text>,
                  }))}
                  pagination={false}
                  scroll={{ x: "max-content" }}
                />
              </div>
              {batchRows.length > 50 && (
                <Text type="secondary" className="text-xs block mt-1">Showing first 50 of {batchRows.length} records</Text>
              )}
              <div className="flex justify-between mt-4">
                <Button size="small" onClick={() => setBatchStep("mapping")} style={{ borderRadius: 6 }}>← Adjust Mapping</Button>
                <Button type="primary" size="small" onClick={executeBatchImport}
                  style={{ borderRadius: 6, background: "linear-gradient(135deg, #10b981, #059669)", border: "none" }}
                  icon={<CloudUploadOutlined />}>
                  Import {batchRows.length} Records
                </Button>
              </div>
            </>
          )}

          {batchStep === "progress" && (
            <div className="text-center py-6">
              <Progress
                type="circle"
                percent={batchProgress.total > 0 ? Math.round((batchProgress.done / batchProgress.total) * 100) : 0}
                strokeColor={{ "0%": g1, "100%": g2 }}
              />
              <Text className="block mt-3">
                Processing {batchProgress.done} / {batchProgress.total} records...
              </Text>
            </div>
          )}

          {batchStep === "done" && (
            <div className="text-center py-4">
              <div className="text-5xl mb-3">{batchProgress.failed === 0 ? "🎉" : "⚠️"}</div>
              <Title level={4} className="!m-0">Import Complete</Title>
              <div className="flex justify-center gap-6 mt-3">
                <div className="text-center">
                  <Text className="text-2xl font-bold block" style={{ color: "#10b981" }}>{batchProgress.success}</Text>
                  <Text type="secondary" className="text-xs">Successful</Text>
                </div>
                <div className="text-center">
                  <Text className="text-2xl font-bold block" style={{ color: batchProgress.failed > 0 ? "#ef4444" : "#9ca3af" }}>{batchProgress.failed}</Text>
                  <Text type="secondary" className="text-xs">Failed</Text>
                </div>
              </div>
              {batchProgress.errors.length > 0 && (
                <Alert
                  type="error"
                  showIcon
                  message={`${batchProgress.errors.length} errors`}
                  description={
                    <ul className="text-xs list-disc pl-4 max-h-32 overflow-y-auto">
                      {batchProgress.errors.slice(0, 10).map((e, i) => <li key={i}>{e}</li>)}
                    </ul>
                  }
                  style={{ marginTop: 12, borderRadius: 8, textAlign: "left" }}
                />
              )}
              <Button type="primary" className="mt-4" onClick={resetBatch}
                style={{ borderRadius: 8, background: `linear-gradient(135deg, ${g1}, ${g2})`, border: "none" }}>
                Done
              </Button>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}
