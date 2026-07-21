"use client";

import React from "react";
import { Button, Divider, Space, Tooltip } from "antd";

interface CADRibbonProps {
  leftTools?: React.ReactNode;
  centerTools?: React.ReactNode;
  rightTools?: React.ReactNode;
  isDark?: boolean;
}

export default function CADRibbon({ leftTools, centerTools, rightTools, isDark = true }: CADRibbonProps) {
  const bg = isDark ? "#333333" : "#e0e0e0";
  const text = isDark ? "#cccccc" : "#333333";
  const divider = isDark ? "#444" : "#ccc";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        height: 40,
        padding: "0 8px",
        backgroundColor: bg,
        color: text,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        {leftTools}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        {centerTools}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        {rightTools}
      </div>
    </div>
  );
}
