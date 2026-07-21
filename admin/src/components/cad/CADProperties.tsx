"use client";

import React from "react";
import { Form, Input, InputNumber, Switch, Divider, Select } from "antd";

interface CADPropertiesProps {
  selectedObject: any | null;
  onUpdate: (updates: any) => void;
  isDark?: boolean;
}

export default function CADProperties({ selectedObject, onUpdate, isDark = true }: CADPropertiesProps) {
  const bg = isDark ? "#252526" : "#f3f3f3";
  const text = isDark ? "#cccccc" : "#333333";
  const border = isDark ? "#444" : "#ccc";

  if (!selectedObject) {
    return (
      <div style={{ padding: 16, color: isDark ? "#888" : "#888", textAlign: "center", fontStyle: "italic" }}>
        No object selected
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", backgroundColor: bg, color: text }}>
      <div style={{ padding: "8px 12px", borderBottom: `1px solid ${border}`, fontWeight: 600, fontSize: 13 }}>
        Properties
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "12px" }}>
        <Form layout="vertical" size="small">
          <Form.Item label={<span style={{ color: text }}>Name / Label</span>}>
            <Input
              value={selectedObject.label || selectedObject.name}
              onChange={(e) => onUpdate({ label: e.target.value })}
              style={{ backgroundColor: isDark ? "#3c3c3c" : "#fff", color: text, borderColor: border }}
            />
          </Form.Item>

          <Divider style={{ borderColor: border, margin: "12px 0" }} />
          <div style={{ marginBottom: 8, fontWeight: 600, fontSize: 12 }}>Transform</div>

          <div style={{ display: "flex", gap: 8 }}>
            <Form.Item label={<span style={{ color: text }}>X</span>} style={{ flex: 1 }}>
              <InputNumber
                value={selectedObject.x}
                onChange={(v) => onUpdate({ x: v })}
                style={{ width: "100%", backgroundColor: isDark ? "#3c3c3c" : "#fff", color: text, borderColor: border }}
              />
            </Form.Item>
            <Form.Item label={<span style={{ color: text }}>Y / Elev</span>} style={{ flex: 1 }}>
              <InputNumber
                value={selectedObject.y || 0}
                onChange={(v) => onUpdate({ y: v })}
                style={{ width: "100%", backgroundColor: isDark ? "#3c3c3c" : "#fff", color: text, borderColor: border }}
              />
            </Form.Item>
            <Form.Item label={<span style={{ color: text }}>Z</span>} style={{ flex: 1 }}>
              <InputNumber
                value={selectedObject.z}
                onChange={(v) => onUpdate({ z: v })}
                style={{ width: "100%", backgroundColor: isDark ? "#3c3c3c" : "#fff", color: text, borderColor: border }}
              />
            </Form.Item>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <Form.Item label={<span style={{ color: text }}>Rotation</span>} style={{ flex: 1 }}>
              <InputNumber
                value={selectedObject.rotation}
                onChange={(v) => onUpdate({ rotation: v })}
                style={{ width: "100%", backgroundColor: isDark ? "#3c3c3c" : "#fff", color: text, borderColor: border }}
              />
            </Form.Item>
          </div>

          <Divider style={{ borderColor: border, margin: "12px 0" }} />
          <div style={{ marginBottom: 8, fontWeight: 600, fontSize: 12 }}>Dimensions</div>

          <div style={{ display: "flex", gap: 8 }}>
            <Form.Item label={<span style={{ color: text }}>Width</span>} style={{ flex: 1 }}>
              <InputNumber
                value={selectedObject.width}
                onChange={(v) => onUpdate({ width: v })}
                style={{ width: "100%", backgroundColor: isDark ? "#3c3c3c" : "#fff", color: text, borderColor: border }}
              />
            </Form.Item>
            <Form.Item label={<span style={{ color: text }}>Depth</span>} style={{ flex: 1 }}>
              <InputNumber
                value={selectedObject.depth}
                onChange={(v) => onUpdate({ depth: v })}
                style={{ width: "100%", backgroundColor: isDark ? "#3c3c3c" : "#fff", color: text, borderColor: border }}
              />
            </Form.Item>
          </div>

          {selectedObject.type === "zone" && (
            <>
              <Divider style={{ borderColor: border, margin: "12px 0" }} />
              <Form.Item label={<span style={{ color: text }}>Zone Type</span>}>
                <Select
                  value={selectedObject.zoneType}
                  onChange={(v) => onUpdate({ zoneType: v })}
                  style={{ width: "100%" }}
                  options={[
                    { value: "storage", label: "Storage" },
                    { value: "picking", label: "Picking" },
                    { value: "cold", label: "Cold" },
                    { value: "quarantine", label: "Quarantine" },
                  ]}
                />
              </Form.Item>
            </>
          )}

          {selectedObject.type === "rack" && (
            <>
              <Divider style={{ borderColor: border, margin: "12px 0" }} />
              <Form.Item label={<span style={{ color: text }}>Levels</span>}>
                <InputNumber
                  value={selectedObject.rackLevels}
                  onChange={(v) => onUpdate({ rackLevels: v })}
                  style={{ width: "100%", backgroundColor: isDark ? "#3c3c3c" : "#fff", color: text, borderColor: border }}
                />
              </Form.Item>
            </>
          )}

          <Divider style={{ borderColor: border, margin: "12px 0" }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12 }}>Locked</span>
            <Switch checked={selectedObject.locked} onChange={(v) => onUpdate({ locked: v })} size="small" />
          </div>
        </Form>
      </div>
    </div>
  );
}
