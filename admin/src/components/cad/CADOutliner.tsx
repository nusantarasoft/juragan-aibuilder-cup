"use client";

import React from "react";
import { Tree, Input } from "antd";
import { SearchOutlined, EyeOutlined, EyeInvisibleOutlined } from "@ant-design/icons";

interface CADOutlinerProps {
  treeData: any[];
  onSelect?: (selectedKeys: React.Key[], info: any) => void;
  isDark?: boolean;
}

export default function CADOutliner({ treeData, onSelect, isDark = true }: CADOutlinerProps) {
  const bg = isDark ? "#252526" : "#f3f3f3";
  const text = isDark ? "#cccccc" : "#333333";
  const border = isDark ? "#444" : "#ccc";
  const searchBg = isDark ? "#3c3c3c" : "#ffffff";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", backgroundColor: bg, color: text }}>
      <div style={{ padding: "8px", borderBottom: `1px solid ${border}` }}>
        <Input
          size="small"
          placeholder="Filter..."
          prefix={<SearchOutlined style={{ color: isDark ? "#888" : "#ccc" }} />}
          style={{
            backgroundColor: searchBg,
            borderColor: border,
            color: text,
            borderRadius: 2,
          }}
        />
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "4px" }}>
        <Tree
          treeData={treeData}
          onSelect={onSelect}
          style={{
            backgroundColor: "transparent",
            color: text,
          }}
          blockNode
        />
      </div>
    </div>
  );
}
