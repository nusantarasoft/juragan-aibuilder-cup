"use client";

import React from "react";
import {
    Button,
    Tooltip,
    Divider,
    Space,
    Segmented,
    Typography,
    Dropdown,
    theme,
} from "antd";
import {
    SelectOutlined,
    DragOutlined,
    RotateRightOutlined,
    ExpandOutlined,
    CopyOutlined,
    DeleteOutlined,
    UndoOutlined,
    RedoOutlined,
    AppstoreOutlined,
    BorderOutlined,
    EyeOutlined,
    EyeInvisibleOutlined,
    AimOutlined,
    ThunderboltOutlined,
    FireOutlined,
    AlertOutlined,
    PlusOutlined,
    EditOutlined,
} from "@ant-design/icons";
import { useScada3dStore, type Scada3dElementType } from "@/store/useScada3dStore";
import { usePreferencesStore } from "@/store/usePreferencesStore";

const { Text } = Typography;

interface ScadaToolbarProps {
    editMode: boolean;
    setEditMode: (v: boolean) => void;
    transformMode: "translate" | "rotate" | "scale";
    setTransformMode: (v: "translate" | "rotate" | "scale") => void;
    selectedId: string | null;
    animateFlow: boolean;
    setAnimateFlow: (v: boolean) => void;
    thermalMode: boolean;
    setThermalMode: (v: boolean) => void;
    alarmActive: boolean;
    setAlarmActive: (v: boolean) => void;
    snapToGrid: boolean;
    setSnapToGrid: (v: boolean) => void;
    showWireframe: boolean;
    setShowWireframe: (v: boolean) => void;
}

// ─── Primitive items for the "Add" dropdown ─────────────────────────────
const primitiveItems: { label: string; type: Scada3dElementType; icon: React.ReactNode }[] = [
    { label: "Box", type: "box", icon: <BorderOutlined /> },
    { label: "Sphere", type: "sphere", icon: <AppstoreOutlined /> },
    { label: "Cylinder", type: "cylinder", icon: <AppstoreOutlined /> },
    { label: "Cone", type: "cone", icon: <AppstoreOutlined /> },
    { label: "Plane", type: "plane", icon: <ExpandOutlined /> },
    { label: "Wall", type: "wall", icon: <BorderOutlined /> },
    { label: "Floor", type: "floor", icon: <BorderOutlined /> },
];

// ─── Segmented transform options ────────────────────────────────────────
const transformOptions: {
    value: "translate" | "rotate" | "scale";
    icon: React.ReactNode;
    tooltip: string;
    shortcut: string;
}[] = [
    { value: "translate", icon: <DragOutlined />, tooltip: "Move", shortcut: "G" },
    { value: "rotate", icon: <RotateRightOutlined />, tooltip: "Rotate", shortcut: "R" },
    { value: "scale", icon: <ExpandOutlined />, tooltip: "Scale", shortcut: "S" },
];

// ─── Toolbar button helper ──────────────────────────────────────────────
function ToolBtn({
    tooltip,
    shortcut,
    icon,
    onClick,
    disabled,
    active,
    danger,
    themeColor,
}: {
    tooltip: string;
    shortcut?: string;
    icon: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    active?: boolean;
    danger?: boolean;
    themeColor?: string;
}) {
    return (
        <Tooltip
            title={
                <span>
                    {tooltip}
                    {shortcut && (
                        <span style={{ opacity: 0.6, marginLeft: 6, fontSize: 11 }}>
                            {shortcut}
                        </span>
                    )}
                </span>
            }
            placement="bottom"
            mouseEnterDelay={0.3}
        >
            <Button
                type="text"
                size="small"
                icon={icon}
                onClick={onClick}
                disabled={disabled}
                danger={danger}
                style={{
                    color: active ? themeColor ?? "#1890ff" : undefined,
                    background: active
                        ? `${themeColor ?? "#1890ff"}18`
                        : "transparent",
                    border: "none",
                    borderRadius: 4,
                    width: 32,
                    height: 32,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}
            />
        </Tooltip>
    );
}

// ─── Vertical thin divider ──────────────────────────────────────────────
function VDivider() {
    return (
        <div
            style={{
                width: 1,
                height: 24,
                background: "rgba(255,255,255,0.15)",
                margin: "0 4px",
                flexShrink: 0,
            }}
        />
    );
}

// ─── Main Component ─────────────────────────────────────────────────────
export default function ScadaToolbar(props: ScadaToolbarProps) {
    const {
        editMode,
        setEditMode,
        transformMode,
        setTransformMode,
        selectedId,
        animateFlow,
        setAnimateFlow,
        thermalMode,
        setThermalMode,
        alarmActive,
        setAlarmActive,
        snapToGrid,
        setSnapToGrid,
        showWireframe,
        setShowWireframe,
    } = props;

    const { token } = theme.useToken();
    const { themeColor } = usePreferencesStore();
    const { addElement, deleteElement, duplicateElement, undo, redo, historyIndex, history } =
        useScada3dStore();

    const canUndo = historyIndex >= 0;
    const canRedo = historyIndex < history.length - 1;

    const handleAddPrimitive = (type: Scada3dElementType) => {
        addElement({
            type,
            position: [0, 0, 0],
            rotation: [0, 0, 0],
            scale: [1, 1, 1],
            properties: { name: `New ${type}` },
        });
    };

    return (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                height: 40,
                padding: "0 8px",
                gap: 2,
                background: "rgba(18, 18, 24, 0.78)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.08)",
                boxShadow: "0 2px 12px rgba(0,0,0,0.35)",
                userSelect: "none",
                overflow: "hidden",
                flexShrink: 0,
            }}
        >
            {/* ── 1. Edit Mode Toggle ────────────────────────────── */}
            <Tooltip title={editMode ? "Switch to View mode" : "Switch to Edit mode"} placement="bottom">
                <Button
                    type={editMode ? "primary" : "text"}
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => setEditMode(!editMode)}
                    style={{
                        height: 28,
                        borderRadius: 4,
                        fontWeight: 600,
                        fontSize: 12,
                        ...(editMode
                            ? { background: themeColor, borderColor: themeColor }
                            : { color: "rgba(255,255,255,0.65)" }),
                    }}
                >
                    {editMode ? "Edit" : "View"}
                </Button>
            </Tooltip>

            <VDivider />

            {/* ── 2. Selection & Transform ────────────────────────── */}
            <Space size={0}>
                {transformOptions.map((opt) => (
                    <ToolBtn
                        key={opt.value}
                        tooltip={opt.tooltip}
                        shortcut={opt.shortcut}
                        icon={opt.icon}
                        active={editMode && transformMode === opt.value}
                        disabled={!editMode}
                        themeColor={themeColor}
                        onClick={() => setTransformMode(opt.value)}
                    />
                ))}
            </Space>

            <VDivider />

            {/* ── 3. Object Actions ──────────────────────────────── */}
            <Space size={0}>
                <ToolBtn
                    tooltip="Duplicate"
                    shortcut="Ctrl+D"
                    icon={<CopyOutlined />}
                    disabled={!editMode || !selectedId}
                    onClick={() => selectedId && duplicateElement(selectedId)}
                />
                <ToolBtn
                    tooltip="Delete"
                    shortcut="Del"
                    icon={<DeleteOutlined />}
                    disabled={!editMode || !selectedId}
                    danger={!!selectedId && editMode}
                    onClick={() => selectedId && deleteElement(selectedId)}
                />
                <ToolBtn
                    tooltip="Undo"
                    shortcut="Ctrl+Z"
                    icon={<UndoOutlined />}
                    disabled={!editMode || !canUndo}
                    onClick={undo}
                />
                <ToolBtn
                    tooltip="Redo"
                    shortcut="Ctrl+Shift+Z"
                    icon={<RedoOutlined />}
                    disabled={!editMode || !canRedo}
                    onClick={redo}
                />
            </Space>

            <VDivider />

            {/* ── 4. Add Primitives Dropdown ──────────────────────── */}
            <Dropdown
                disabled={!editMode}
                menu={{
                    items: primitiveItems.map((item) => ({
                        key: item.type,
                        label: item.label,
                        icon: item.icon,
                        onClick: () => handleAddPrimitive(item.type),
                    })),
                }}
                trigger={["click"]}
                placement="bottomLeft"
            >
                <Tooltip title="Add primitive object" placement="bottom">
                    <Button
                        type="text"
                        size="small"
                        icon={<PlusOutlined />}
                        disabled={!editMode}
                        style={{
                            height: 28,
                            borderRadius: 4,
                            fontSize: 12,
                            color: editMode ? "rgba(255,255,255,0.85)" : undefined,
                        }}
                    >
                        Add
                    </Button>
                </Tooltip>
            </Dropdown>

            <VDivider />

            {/* ── 5. View Options ─────────────────────────────────── */}
            <Space size={0}>
                <ToolBtn
                    tooltip="Snap to Grid"
                    icon={<AimOutlined />}
                    active={snapToGrid}
                    themeColor={themeColor}
                    onClick={() => setSnapToGrid(!snapToGrid)}
                />
                <ToolBtn
                    tooltip="Wireframe"
                    icon={showWireframe ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                    active={showWireframe}
                    themeColor={themeColor}
                    onClick={() => setShowWireframe(!showWireframe)}
                />
            </Space>

            <VDivider />

            {/* ── 6. Simulation Controls ──────────────────────────── */}
            <Space size={0}>
                <ToolBtn
                    tooltip="Flow Simulation"
                    icon={<ThunderboltOutlined />}
                    active={animateFlow}
                    themeColor={themeColor}
                    onClick={() => setAnimateFlow(!animateFlow)}
                />
                <ToolBtn
                    tooltip="Thermal View"
                    icon={<FireOutlined />}
                    active={thermalMode}
                    themeColor="#fa541c"
                    onClick={() => setThermalMode(!thermalMode)}
                />
                <ToolBtn
                    tooltip="Alarm Mode"
                    icon={<AlertOutlined />}
                    active={alarmActive}
                    themeColor="#f5222d"
                    danger={alarmActive}
                    onClick={() => setAlarmActive(!alarmActive)}
                />
            </Space>

            {/* ── Right-aligned status ────────────────────────────── */}
            <div style={{ flex: 1 }} />
            <Text
                style={{
                    fontSize: 11,
                    color: "rgba(255,255,255,0.35)",
                    whiteSpace: "nowrap",
                    paddingRight: 4,
                }}
            >
                {selectedId ?? "No selection"}
            </Text>
        </div>
    );
}
