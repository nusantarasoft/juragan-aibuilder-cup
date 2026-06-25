"use client";

import React, { useState } from "react";
import { Button, Tooltip, Layout, theme } from "antd";
import { MenuFoldOutlined, MenuUnfoldOutlined } from "@ant-design/icons";
import { motion } from "framer-motion";

interface CADLayoutProps {
  header?: React.ReactNode;
  leftPanel?: React.ReactNode;
  rightPanel?: React.ReactNode;
  bottomPanel?: React.ReactNode;
  children: React.ReactNode;
  isDark?: boolean;
  unrealMode?: boolean; // New prop for premium fullscreen UI
}

export default function CADLayout({
  header,
  leftPanel,
  rightPanel,
  bottomPanel,
  children,
  isDark = true,
  unrealMode = false,
}: CADLayoutProps) {
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);

  // Strict colors for CAD UI
  const bgColors = {
    panel: isDark ? "#252526" : "#f3f3f3",
    header: isDark ? "#333333" : "#e0e0e0",
    viewport: isDark ? "#1e1e1e" : "#ffffff",
    border: isDark ? "#444444" : "#cccccc",
    text: isDark ? "#cccccc" : "#333333",
  };

  // -------------------------------------------------------------
  // UNREAL MODE (Premium Glassmorphic Floating UI)
  // -------------------------------------------------------------
  if (unrealMode) {
    return (
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          overflow: "hidden",
          backgroundColor: "#09090b",
          zIndex: 9999, // Overlay above CMSLayout
          color: "#fff",
          fontFamily: "Inter, system-ui, sans-serif",
        }}
      >
        {/* VIEWPORT (BOTTOM LAYER) */}
        <div style={{ position: "absolute", inset: 0, zIndex: 1 }}>
          {children}
        </div>

        {/* UI OVERLAY LAYER */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 10,
            pointerEvents: "none", // Let clicks pass through to Canvas
          }}
        >
          {/* HEADER (Floating Top Pill) */}
          {header && (
            <motion.div
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              style={{
                position: "absolute",
                top: 16,
                left: "50%",
                transform: "translateX(-50%)",
                pointerEvents: "auto",
                background: "rgba(15, 15, 20, 0.75)",
                backdropFilter: "blur(24px) saturate(180%)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: 24,
                padding: "8px 24px",
                boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                display: "flex",
                alignItems: "center",
                gap: 16,
              }}
            >
              {header}
            </motion.div>
          )}

          {/* LEFT PANEL */}
          {leftPanel && (
            <motion.div
              initial={{ x: -300, opacity: 0 }}
              animate={{ x: leftCollapsed ? -360 : 0, opacity: leftCollapsed ? 0 : 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              style={{
                position: "absolute",
                top: 80,
                left: 16,
                bottom: 16,
                width: 340,
                pointerEvents: "auto",
                background: "rgba(15, 15, 20, 0.75)",
                backdropFilter: "blur(24px) saturate(180%)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: 16,
                boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {leftPanel}
            </motion.div>
          )}
          
          {/* LEFT PANEL TOGGLE BUTTON */}
          {leftPanel && (
            <div style={{ position: "absolute", top: "50%", left: leftCollapsed ? 16 : 366, transform: "translateY(-50%)", pointerEvents: "auto", transition: "left 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)" }}>
               <Button
                  type="text"
                  icon={leftCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                  onClick={() => setLeftCollapsed(!leftCollapsed)}
                  style={{
                    background: "rgba(15, 15, 20, 0.85)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "#fff",
                    borderRadius: 8,
                    width: 32,
                    height: 48,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.3)"
                  }}
                />
            </div>
          )}

          {/* RIGHT PANEL */}
          {rightPanel && (
            <motion.div
              initial={{ x: 300, opacity: 0 }}
              animate={{ x: rightCollapsed ? 360 : 0, opacity: rightCollapsed ? 0 : 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              style={{
                position: "absolute",
                top: 80,
                right: 16,
                bottom: 16,
                width: 340,
                pointerEvents: "auto",
                background: "rgba(15, 15, 20, 0.75)",
                backdropFilter: "blur(24px) saturate(180%)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: 16,
                boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {rightPanel}
            </motion.div>
          )}

          {/* RIGHT PANEL TOGGLE BUTTON */}
          {rightPanel && (
            <div style={{ position: "absolute", top: "50%", right: rightCollapsed ? 16 : 366, transform: "translateY(-50%)", pointerEvents: "auto", transition: "right 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)" }}>
               <Button
                  type="text"
                  icon={rightCollapsed ? <MenuFoldOutlined /> : <MenuUnfoldOutlined />}
                  onClick={() => setRightCollapsed(!rightCollapsed)}
                  style={{
                    background: "rgba(15, 15, 20, 0.85)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "#fff",
                    borderRadius: 8,
                    width: 32,
                    height: 48,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.3)"
                  }}
                />
            </div>
          )}

        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // STANDARD MODE (Legacy Panel Layout)
  // -------------------------------------------------------------
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        overflow: "hidden",
        backgroundColor: bgColors.viewport,
        color: bgColors.text,
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      {/* HEADER / RIBBON */}
      {header && (
        <div
          style={{
            flex: "0 0 auto",
            backgroundColor: bgColors.header,
            borderBottom: `1px solid ${bgColors.border}`,
            zIndex: 100,
          }}
        >
          {header}
        </div>
      )}

      {/* MIDDLE SECTION */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* LEFT PANEL */}
        {leftPanel && (
          <div
            style={{
              width: leftCollapsed ? 0 : 280,
              backgroundColor: bgColors.panel,
              borderRight: leftCollapsed ? "none" : `1px solid ${bgColors.border}`,
              transition: "width 0.2s ease-in-out",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              position: "relative",
              flexShrink: 0,
            }}
          >
            {leftPanel}
            {!leftCollapsed && (
              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  right: 0,
                  transform: "translateY(-50%)",
                  zIndex: 10,
                }}
              >
                <Button
                  type="text"
                  size="small"
                  icon={<MenuFoldOutlined />}
                  onClick={() => setLeftCollapsed(true)}
                  style={{
                    background: bgColors.panel,
                    border: `1px solid ${bgColors.border}`,
                    borderRight: "none",
                    borderRadius: "4px 0 0 4px",
                    padding: "0 4px",
                    height: 32,
                    color: bgColors.text,
                  }}
                />
              </div>
            )}
            {leftCollapsed && (
               <div
               style={{
                 position: "absolute",
                 top: "50%",
                 left: "100%",
                 transform: "translateY(-50%)",
                 zIndex: 10,
               }}
             >
               <Button
                 type="text"
                 size="small"
                 icon={<MenuUnfoldOutlined />}
                 onClick={() => setLeftCollapsed(false)}
                 style={{
                   background: bgColors.panel,
                   border: `1px solid ${bgColors.border}`,
                   borderLeft: "none",
                   borderRadius: "0 4px 4px 0",
                   padding: "0 4px",
                   height: 32,
                   color: bgColors.text,
                 }}
               />
             </div>
            )}
          </div>
        )}

        {/* VIEWPORT (CENTER) */}
        <div
          style={{
            flex: 1,
            position: "relative",
            overflow: "hidden",
            backgroundColor: bgColors.viewport,
          }}
        >
          {children}
        </div>

        {/* RIGHT PANEL */}
        {rightPanel && (
          <div
            style={{
              width: rightCollapsed ? 0 : 320,
              backgroundColor: bgColors.panel,
              borderLeft: rightCollapsed ? "none" : `1px solid ${bgColors.border}`,
              transition: "width 0.2s ease-in-out",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              position: "relative",
              flexShrink: 0,
            }}
          >
            {!rightCollapsed && (
              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: 0,
                  transform: "translateY(-50%)",
                  zIndex: 10,
                }}
              >
                <Button
                  type="text"
                  size="small"
                  icon={<MenuUnfoldOutlined />}
                  onClick={() => setRightCollapsed(true)}
                  style={{
                    background: bgColors.panel,
                    border: `1px solid ${bgColors.border}`,
                    borderLeft: "none",
                    borderRadius: "0 4px 4px 0",
                    padding: "0 4px",
                    height: 32,
                    color: bgColors.text,
                  }}
                />
              </div>
            )}
            {rightCollapsed && (
              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  right: "100%",
                  transform: "translateY(-50%)",
                  zIndex: 10,
                }}
              >
                <Button
                  type="text"
                  size="small"
                  icon={<MenuFoldOutlined />}
                  onClick={() => setRightCollapsed(false)}
                  style={{
                    background: bgColors.panel,
                    border: `1px solid ${bgColors.border}`,
                    borderRight: "none",
                    borderRadius: "4px 0 0 4px",
                    padding: "0 4px",
                    height: 32,
                    color: bgColors.text,
                  }}
                />
              </div>
            )}
            {rightPanel}
          </div>
        )}
      </div>

      {/* BOTTOM PANEL / STATUS BAR */}
      {bottomPanel && (
        <div
          style={{
            flex: "0 0 auto",
            height: 28,
            backgroundColor: bgColors.header,
            borderTop: `1px solid ${bgColors.border}`,
            display: "flex",
            alignItems: "center",
            padding: "0 8px",
            fontSize: 12,
            zIndex: 100,
          }}
        >
          {bottomPanel}
        </div>
      )}
    </div>
  );
}
